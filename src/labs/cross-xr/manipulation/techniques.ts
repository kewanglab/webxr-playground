import { Matrix4, Quaternion, Ray, Vector3 } from 'three'
import type { HandJointData } from './useHandJoints'
import type { ManipulationTechnique } from '../ObjectManipulationLab'

/**
 * Snapshot of hand state at the moment of acquisition (pinch start).
 * Each technique records the data it needs for its own delta computation.
 */
export type AcquisitionSnapshot = {
  thumbTipPosition: Vector3
  thumbTipQuaternion: Quaternion
  wristPosition: Vector3
  wristQuaternion: Quaternion
  /** Object position at acquisition */
  objectPosition: Vector3
  /** Object quaternion at acquisition */
  objectQuaternion: Quaternion
  /** Inverse of thumb quaternion at acquisition, cached for delta computation */
  thumbQuatInverse: Quaternion
  /** Inverse of wrist quaternion at acquisition, cached for HRS */
  wristQuatInverse: Quaternion
  /** Ray direction at acquisition for HRI/HRS */
  rayDirection: Vector3
  /** Distance from ray origin to object at acquisition, for ray techniques */
  rayDistance: number
  /** Distance from shoulder to wrist at acquisition, for HRS depth modulation */
  shoulderToWristDistance: number
}

export type ManipulationResult = {
  position: Vector3
  quaternion: Quaternion
}

const _tmpQuat = new Quaternion()
const _tmpVec = new Vector3()
const _tmpVec2 = new Vector3()

export function createAcquisitionSnapshot(
  joints: HandJointData,
  objectPosition: Vector3,
  objectQuaternion: Quaternion,
  technique: ManipulationTechnique,
  headPosition: Vector3,
  shoulderOffset: [number, number, number],
): AcquisitionSnapshot {
  const rayOrigin = estimateShoulderPosition(
    headPosition,
    joints.wristPosition,
    shoulderOffset,
  )
  const rayDir = new Vector3().subVectors(joints.wristPosition, rayOrigin).normalize()
  const rayDist = new Vector3().subVectors(objectPosition, rayOrigin).length()

  return {
    thumbTipPosition: joints.thumbTipPosition.clone(),
    thumbTipQuaternion: joints.thumbTipQuaternion.clone(),
    wristPosition: joints.wristPosition.clone(),
    wristQuaternion: joints.wristQuaternion.clone(),
    objectPosition: objectPosition.clone(),
    objectQuaternion: objectQuaternion.clone(),
    thumbQuatInverse: joints.thumbTipQuaternion.clone().invert(),
    wristQuatInverse: joints.wristQuaternion.clone().invert(),
    rayDirection: rayDir,
    rayDistance: rayDist,
    shoulderToWristDistance: new Vector3().subVectors(joints.wristPosition, rayOrigin).length(),
  }
}

/**
 * Approximate shoulder position from headset and hand position.
 * MRTK-style: offset below and to the side of the head.
 */
export function estimateShoulderPosition(
  headPosition: Vector3,
  wristPosition: Vector3,
  offset: [number, number, number],
): Vector3 {
  const side = wristPosition.x > headPosition.x ? 1 : -1
  return new Vector3(
    headPosition.x + Math.abs(offset[0]) * side,
    headPosition.y + offset[1],
    headPosition.z + offset[2],
  )
}

/**
 * Virtual Hand Integrated (VHI):
 * Direct 1:1 mapping — thumb tip drives both translation and rotation.
 */
function computeVHI(
  joints: HandJointData,
  snap: AcquisitionSnapshot,
  cdGain: number,
): ManipulationResult {
  const deltaPos = _tmpVec
    .subVectors(joints.thumbTipPosition, snap.thumbTipPosition)
    .multiplyScalar(cdGain)
  const deltaQuat = _tmpQuat.copy(snap.thumbQuatInverse).premultiply(joints.thumbTipQuaternion)

  return {
    position: new Vector3().addVectors(snap.objectPosition, deltaPos),
    quaternion: new Quaternion().multiplyQuaternions(deltaQuat, snap.objectQuaternion),
  }
}

/**
 * Virtual Hand Separated (VHS):
 * Wrist drives translation, thumb orientation drives rotation independently.
 */
function computeVHS(
  joints: HandJointData,
  snap: AcquisitionSnapshot,
  cdGain: number,
): ManipulationResult {
  const deltaPos = _tmpVec
    .subVectors(joints.wristPosition, snap.wristPosition)
    .multiplyScalar(cdGain)
  const deltaQuat = _tmpQuat.copy(snap.thumbQuatInverse).premultiply(joints.thumbTipQuaternion)

  return {
    position: new Vector3().addVectors(snap.objectPosition, deltaPos),
    quaternion: new Quaternion().multiplyQuaternions(deltaQuat, snap.objectQuaternion),
  }
}

/**
 * Hand Ray Integrated (HRI):
 * "Stick" metaphor — ray from wrist, object rides the end of the stick.
 * Only roll (pronation/supination) maps to object rotation.
 */
function computeHRI(
  joints: HandJointData,
  snap: AcquisitionSnapshot,
  cdGain: number,
  headPosition: Vector3,
  shoulderOffset: [number, number, number],
): ManipulationResult {
  const forward = new Vector3(0, 0, -1).applyQuaternion(joints.wristQuaternion)
  const newPos = new Vector3()
    .copy(joints.wristPosition)
    .addScaledVector(forward, snap.rayDistance * cdGain)

  // Only extract roll (Z-axis rotation) relative to acquisition
  const deltaQuat = _tmpQuat.copy(snap.wristQuatInverse).premultiply(joints.wristQuaternion)
  const localForward = new Vector3(0, 0, 1)
  const rotatedForward = localForward.applyQuaternion(deltaQuat)
  // Project to extract roll angle around the forward axis
  const rollAngle = Math.atan2(rotatedForward.x, rotatedForward.y)
  const rollQuat = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -rollAngle)

  return {
    position: newPos,
    quaternion: new Quaternion().multiplyQuaternions(rollQuat, snap.objectQuaternion),
  }
}

/**
 * Hand Ray Separated (HRS):
 * Shoulder-to-wrist ray for pointing/translation.
 * Wrist orientation maps to object rotation without displacement (MRTK-style).
 */
function computeHRS(
  joints: HandJointData,
  snap: AcquisitionSnapshot,
  cdGain: number,
  headPosition: Vector3,
  shoulderOffset: [number, number, number],
): ManipulationResult {
  const shoulderPos = estimateShoulderPosition(headPosition, joints.wristPosition, shoulderOffset)
  const rayDir = _tmpVec.subVectors(joints.wristPosition, shoulderPos).normalize()

  // Depth modulation: extending/retracting arm adjusts ray distance
  const currentArmLength = joints.wristPosition.distanceTo(shoulderPos)
  const armDelta = (currentArmLength - snap.shoulderToWristDistance) * cdGain
  const effectiveDistance = Math.max(0.1, snap.rayDistance + armDelta)

  const newPos = _tmpVec2.copy(shoulderPos).addScaledVector(rayDir, effectiveDistance)

  // Wrist orientation delta drives object rotation
  const deltaQuat = _tmpQuat.copy(snap.wristQuatInverse).premultiply(joints.wristQuaternion)

  return {
    position: newPos,
    quaternion: new Quaternion().multiplyQuaternions(deltaQuat, snap.objectQuaternion),
  }
}

export function computeManipulation(
  technique: ManipulationTechnique,
  joints: HandJointData,
  snap: AcquisitionSnapshot,
  cdGain: number,
  headPosition: Vector3,
  shoulderOffset: [number, number, number],
): ManipulationResult {
  switch (technique) {
    case 'VHI':
      return computeVHI(joints, snap, cdGain)
    case 'VHS':
      return computeVHS(joints, snap, cdGain)
    case 'HRI':
      return computeHRI(joints, snap, cdGain, headPosition, shoulderOffset)
    case 'HRS':
      return computeHRS(joints, snap, cdGain, headPosition, shoulderOffset)
  }
}

/**
 * Check if a position is within grab range for Virtual Hand techniques.
 */
export function isWithinGrabRange(
  thumbPosition: Vector3,
  objectPosition: Vector3,
  grabDistance: number,
): boolean {
  return thumbPosition.distanceTo(objectPosition) <= grabDistance
}

/**
 * Cast a ray and test intersection with a sphere around the object.
 * Used for Hand Ray acquisition.
 */
export function rayHitsObject(
  rayOrigin: Vector3,
  rayDirection: Vector3,
  objectPosition: Vector3,
  hitRadius: number,
): boolean {
  const ray = new Ray(rayOrigin, rayDirection)
  const closest = new Vector3()
  ray.closestPointToPoint(objectPosition, closest)
  return closest.distanceTo(objectPosition) <= hitRadius
}
