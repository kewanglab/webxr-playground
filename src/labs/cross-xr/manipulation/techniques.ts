import { Quaternion, Vector3 } from 'three'
import type { HandJointData } from './useHandJoints'
import type { ManipulationTechnique } from '../ObjectManipulationLab'

/**
 * Snapshot of hand state at the moment of acquisition (pinch start).
 */
export type AcquisitionSnapshot = {
  thumbTipPosition: Vector3
  thumbTipQuaternion: Quaternion
  wristPosition: Vector3
  objectPosition: Vector3
  objectQuaternion: Quaternion
  /** Inverse of thumb quaternion at acquisition, cached for delta computation */
  thumbQuatInverse: Quaternion
  /** Vector from thumb-tip to object center at acquisition (pinch-point pivot offset) */
  grabOffset: Vector3
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
): AcquisitionSnapshot {
  return {
    thumbTipPosition: joints.thumbTipPosition.clone(),
    thumbTipQuaternion: joints.thumbTipQuaternion.clone(),
    wristPosition: joints.wristPosition.clone(),
    objectPosition: objectPosition.clone(),
    objectQuaternion: objectQuaternion.clone(),
    thumbQuatInverse: joints.thumbTipQuaternion.clone().invert(),
    grabOffset: new Vector3().subVectors(objectPosition, joints.thumbTipPosition),
  }
}

/**
 * VHI — Integrated Virtual Hand (Mikkelsen et al. §3.2.1):
 * 1:1 mapping from 6DOF thumb-tip movement to the object.
 * The object is "glued" to the pinch point: rotation pivots around
 * the thumb tip (not the object center), so the object center orbits
 * the pinch point when the hand rotates — matching real-world grip.
 */
function computeIntegrated(
  joints: HandJointData,
  snap: AcquisitionSnapshot,
  cdGain: number,
): ManipulationResult {
  const deltaPos = _tmpVec
    .subVectors(joints.thumbTipPosition, snap.thumbTipPosition)
    .multiplyScalar(cdGain)
  const deltaQuat = _tmpQuat.copy(snap.thumbQuatInverse).premultiply(joints.thumbTipQuaternion)

  // Rotate grabOffset (thumb→objectCenter) by deltaQuat so the object
  // center orbits the pinch point when the hand rotates.
  const rotatedOffset = _tmpVec2.copy(snap.grabOffset).applyQuaternion(deltaQuat)

  return {
    position: new Vector3()
      .copy(snap.thumbTipPosition)
      .add(deltaPos)
      .add(rotatedOffset),
    quaternion: new Quaternion().multiplyQuaternions(deltaQuat, snap.objectQuaternion),
  }
}

/**
 * VHS — Separated Virtual Hand (Mikkelsen et al. §3.2.1, Figure 2b):
 *
 * Translation: wrist position delta drives object translation.
 * Because the wrist doesn't arc when you flex/rotate it (unlike the
 * thumb tip), wrist rotation no longer causes unwanted translation.
 *
 * Rotation: thumb orientation delta drives object rotation (same source
 * as VHI, per Figure 2b: "rotates following the orientation of the thumb
 * at pinch point"). "Egocentric" means the rotation is about the object's
 * own centre and, crucially, doesn't bleed into the translation channel
 * because translation is wrist-driven.
 *
 * The paper's "forward offset" balances effective reach between VHI and
 * VHS. With cdGain=1 the object is already at the thumb tip at grab, so
 * no per-frame offset is needed — the reach is equivalent.
 */
function computeSeparated(
  joints: HandJointData,
  snap: AcquisitionSnapshot,
  cdGain: number,
): ManipulationResult {
  // Translation: wrist position delta only — immune to wrist rotation
  const deltaPos = _tmpVec
    .subVectors(joints.wristPosition, snap.wristPosition)
    .multiplyScalar(cdGain)

  // Rotation: thumb orientation delta (same as VHI), applied egocentrically
  const deltaQuat = _tmpQuat.copy(snap.thumbQuatInverse).premultiply(joints.thumbTipQuaternion)

  return {
    position: new Vector3().addVectors(snap.objectPosition, deltaPos),
    quaternion: new Quaternion().multiplyQuaternions(deltaQuat, snap.objectQuaternion),
  }
}

export function computeManipulation(
  technique: ManipulationTechnique,
  joints: HandJointData,
  snap: AcquisitionSnapshot,
  cdGain: number,
): ManipulationResult {
  switch (technique) {
    case 'integrated':
      return computeIntegrated(joints, snap, cdGain)
    case 'separated':
      return computeSeparated(joints, snap, cdGain)
  }
}
