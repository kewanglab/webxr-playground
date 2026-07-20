import { describe, expect, test } from 'vitest'
import { Quaternion, Vector3 } from 'three'
import {
  computeManipulation,
  createAcquisitionSnapshot,
} from '../../src/labs/cross-xr/manipulation/techniques'
import type { HandJointData } from '../../src/labs/cross-xr/manipulation/useHandJoints'

function makeJoints(overrides: Partial<HandJointData> = {}): HandJointData {
  return {
    wristPosition: new Vector3(0, 1.0, -0.2),
    wristQuaternion: new Quaternion(),
    thumbTipPosition: new Vector3(0.1, 1.1, -0.3),
    thumbTipQuaternion: new Quaternion(),
    indexTipPosition: new Vector3(0.12, 1.1, -0.3),
    isPinching: true,
    isTracking: true,
    ...overrides,
  }
}

function expectVecClose(actual: Vector3, expected: Vector3) {
  expect(actual.distanceTo(expected)).toBeLessThan(1e-6)
}

function expectQuatClose(actual: Quaternion, expected: Quaternion) {
  expect(actual.angleTo(expected)).toBeLessThan(1e-6)
}

const yaw90 = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI / 2)

describe('createAcquisitionSnapshot', () => {
  test('grabOffset is the vector from thumb tip to object center', () => {
    const joints = makeJoints()
    const objectPos = new Vector3(0.2, 1.2, -0.5)
    const snap = createAcquisitionSnapshot(joints, objectPos, new Quaternion())

    expectVecClose(snap.grabOffset, new Vector3(0.1, 0.1, -0.2))
  })

  test('snapshot is isolated from later mutation of the source joints', () => {
    const joints = makeJoints()
    const snap = createAcquisitionSnapshot(joints, new Vector3(), new Quaternion())

    joints.thumbTipPosition.set(9, 9, 9)
    joints.wristPosition.set(9, 9, 9)

    expectVecClose(snap.thumbTipPosition, new Vector3(0.1, 1.1, -0.3))
    expectVecClose(snap.wristPosition, new Vector3(0, 1.0, -0.2))
  })

  test('thumbQuatInverse is the inverse of the acquisition thumb orientation', () => {
    const joints = makeJoints({ thumbTipQuaternion: yaw90.clone() })
    const snap = createAcquisitionSnapshot(joints, new Vector3(), new Quaternion())

    const product = snap.thumbQuatInverse.clone().premultiply(joints.thumbTipQuaternion)
    expectQuatClose(product, new Quaternion())
  })
})

describe('VHI (integrated) technique', () => {
  test('no hand movement leaves the object exactly where it was grabbed', () => {
    const joints = makeJoints()
    const objectPos = new Vector3(0.2, 1.2, -0.5)
    const objectQuat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.3)
    const snap = createAcquisitionSnapshot(joints, objectPos, objectQuat)

    const result = computeManipulation('integrated', joints, snap, 1)

    expectVecClose(result.position, objectPos)
    expectQuatClose(result.quaternion, objectQuat)
  })

  test('thumb translation maps 1:1 onto the object at cdGain 1', () => {
    const joints = makeJoints()
    const objectPos = new Vector3(0.2, 1.2, -0.5)
    const snap = createAcquisitionSnapshot(joints, objectPos, new Quaternion())

    const moved = makeJoints({
      thumbTipPosition: joints.thumbTipPosition.clone().add(new Vector3(0.05, -0.02, 0.1)),
    })
    const result = computeManipulation('integrated', moved, snap, 1)

    expectVecClose(result.position, objectPos.clone().add(new Vector3(0.05, -0.02, 0.1)))
  })

  test('cdGain scales the translation delta', () => {
    const joints = makeJoints()
    const objectPos = new Vector3(0.2, 1.2, -0.5)
    const snap = createAcquisitionSnapshot(joints, objectPos, new Quaternion())

    const moved = makeJoints({
      thumbTipPosition: joints.thumbTipPosition.clone().add(new Vector3(0.1, 0, 0)),
    })
    const result = computeManipulation('integrated', moved, snap, 2)

    expectVecClose(result.position, objectPos.clone().add(new Vector3(0.2, 0, 0)))
  })

  test('rotation pivots around the pinch point, not the object center', () => {
    // Object grabbed 0.1 m in front of the thumb tip (-z). Rotating the hand
    // 90° about +Y should swing the object center to 0.1 m left of the thumb
    // tip (-x) — the orbit that makes a real-world grip feel "glued".
    const joints = makeJoints()
    const objectPos = joints.thumbTipPosition.clone().add(new Vector3(0, 0, -0.1))
    const snap = createAcquisitionSnapshot(joints, objectPos, new Quaternion())

    const rotated = makeJoints({ thumbTipQuaternion: yaw90.clone() })
    const result = computeManipulation('integrated', rotated, snap, 1)

    expectVecClose(
      result.position,
      joints.thumbTipPosition.clone().add(new Vector3(-0.1, 0, 0)),
    )
    expectQuatClose(result.quaternion, yaw90)
  })
})

describe('VHS (separated) technique', () => {
  test('wrist translation drives the object; cdGain applies', () => {
    const joints = makeJoints()
    const objectPos = new Vector3(0.2, 1.2, -0.5)
    const snap = createAcquisitionSnapshot(joints, objectPos, new Quaternion())

    const moved = makeJoints({
      wristPosition: joints.wristPosition.clone().add(new Vector3(0.05, 0.05, 0)),
    })
    const result = computeManipulation('separated', moved, snap, 2)

    expectVecClose(result.position, objectPos.clone().add(new Vector3(0.1, 0.1, 0)))
  })

  test('thumb rotation does NOT translate the object (the point of DOF separation)', () => {
    const joints = makeJoints()
    const objectPos = new Vector3(0.2, 1.2, -0.5)
    const snap = createAcquisitionSnapshot(joints, objectPos, new Quaternion())

    const rotated = makeJoints({ thumbTipQuaternion: yaw90.clone() })
    const result = computeManipulation('separated', rotated, snap, 1)

    expectVecClose(result.position, objectPos)
    expectQuatClose(result.quaternion, yaw90)
  })

  test('thumb translation alone does NOT move the object', () => {
    const joints = makeJoints()
    const objectPos = new Vector3(0.2, 1.2, -0.5)
    const snap = createAcquisitionSnapshot(joints, objectPos, new Quaternion())

    const moved = makeJoints({
      thumbTipPosition: joints.thumbTipPosition.clone().add(new Vector3(0.3, 0, 0)),
    })
    const result = computeManipulation('separated', moved, snap, 1)

    expectVecClose(result.position, objectPos)
  })

  test('object rotation composes the thumb delta with the acquisition orientation', () => {
    const initialQuat = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.5)
    const joints = makeJoints()
    const snap = createAcquisitionSnapshot(joints, new Vector3(), initialQuat)

    const rotated = makeJoints({ thumbTipQuaternion: yaw90.clone() })
    const result = computeManipulation('separated', rotated, snap, 1)

    const expected = new Quaternion().multiplyQuaternions(yaw90, initialQuat)
    expectQuatClose(result.quaternion, expected)
  })
})
