import { useFrame } from '@react-three/fiber'
import { useCallback, useRef } from 'react'
import { Object3D, Quaternion, Vector3 } from 'three'
import type { ManipulationAcquisition, ManipulationTechnique } from '../ObjectManipulationLab'
import type { HandJointData } from './useHandJoints'
import {
  type AcquisitionSnapshot,
  type ManipulationResult,
  computeManipulation,
  createAcquisitionSnapshot,
} from './techniques'

const _obbInvQuat = new Quaternion()
const _obbLocalThumb = new Vector3()

/** Shortest distance from world-space point to an OBB (center, rotation, half-extents). */
function distancePointToObb(
  worldPoint: Vector3,
  center: Vector3,
  rotation: Quaternion,
  halfExtents: Vector3,
): number {
  _obbInvQuat.copy(rotation).invert()
  _obbLocalThumb.copy(worldPoint).sub(center).applyQuaternion(_obbInvQuat)
  const dx = Math.max(Math.abs(_obbLocalThumb.x) - halfExtents.x, 0)
  const dy = Math.max(Math.abs(_obbLocalThumb.y) - halfExtents.y, 0)
  const dz = Math.max(Math.abs(_obbLocalThumb.z) - halfExtents.z, 0)
  return Math.hypot(dx, dy, dz)
}

export type ManipulableEntry = {
  id: string
  objectRef: { current: Object3D | null }
  position: Vector3
  quaternion: Quaternion
  /** Half-extents along the object's local X/Y/Z (matches boxGeometry-style meshes). */
  hitHalfExtents: Vector3
  constrainResult?: (
    result: ManipulationResult,
    entry: ManipulableEntry,
  ) => ManipulationResult
  onUpdate?: (result: ManipulationResult) => void
}

export type ManipulationState = {
  isManipulating: boolean
  targetId: string | null
  /** Positional offset from target on release (docking mode) */
  lastPositionalOffset: number | null
  /** Rotational offset from target on release (docking mode, degrees) */
  lastRotationalOffset: number | null
}

export type UseManipulationOptions = {
  acquisition: ManipulationAcquisition
  technique: ManipulationTechnique
  joints: HandJointData
  cdGain: number
  grabDistance: number
  onAcquire?: (id: string) => void
  onRelease?: (id: string, result: ManipulationResult) => void
}

/**
 * Manages the acquire → manipulate → release cycle.
 * Acquisition can be proximity-based (custom pinch near object) or
 * ray-based (framework pointer events).
 */
export function useManipulation(options: UseManipulationOptions) {
  const { acquisition, technique, joints, cdGain, grabDistance, onAcquire, onRelease } = options

  const registryRef = useRef<Map<string, ManipulableEntry>>(new Map())
  const snapRef = useRef<AcquisitionSnapshot | null>(null)
  const activeIdRef = useRef<string | null>(null)
  const wasPinching = useRef(false)
  const stateRef = useRef<ManipulationState>({
    isManipulating: false,
    targetId: null,
    lastPositionalOffset: null,
    lastRotationalOffset: null,
  })

  const register = useCallback((entry: ManipulableEntry) => {
    registryRef.current.set(entry.id, entry)
    return () => {
      registryRef.current.delete(entry.id)
    }
  }, [])

  const acquireById = useCallback(
    (id: string) => {
      if (!joints.isTracking || stateRef.current.isManipulating) return
      const entry = registryRef.current.get(id)
      if (!entry) return
      snapRef.current = createAcquisitionSnapshot(joints, entry.position, entry.quaternion)
      activeIdRef.current = id
      stateRef.current.isManipulating = true
      stateRef.current.targetId = id
      onAcquire?.(id)
    },
    [joints, onAcquire],
  )

  const releaseActive = useCallback(() => {
    if (!stateRef.current.isManipulating || !activeIdRef.current) return
    const activeId = activeIdRef.current
    const entry = registryRef.current.get(activeId)
    if (entry) {
      onRelease?.(activeId, {
        position: entry.position.clone(),
        quaternion: entry.quaternion.clone(),
      })
    }
    snapRef.current = null
    activeIdRef.current = null
    stateRef.current.isManipulating = false
    stateRef.current.targetId = null
  }, [onRelease])

  useFrame(() => {
    if (!joints.isTracking) return
    const state = stateRef.current
    const pinchJustStarted =
      acquisition === 'proximity' && joints.isPinching && !wasPinching.current
    // Ray acquisition uses pointerdown on the mesh to grab, but release must follow
    // WebXR selectend (pinch open) — pointerup only fires if the ray still hits the mesh.
    const pinchJustEnded = !joints.isPinching && wasPinching.current
    wasPinching.current = joints.isPinching

    if (pinchJustStarted && !state.isManipulating) {
      const hit = findClosestInRange(joints, registryRef.current, grabDistance)
      if (hit) {
        acquireById(hit)
      }
    }

    if (state.isManipulating && snapRef.current && activeIdRef.current) {
      const entry = registryRef.current.get(activeIdRef.current)
      if (entry) {
        const result = computeManipulation(
          technique,
          joints,
          snapRef.current,
          cdGain,
        )
        const next = entry.constrainResult
          ? entry.constrainResult(result, entry)
          : result
        entry.position.copy(next.position)
        entry.quaternion.copy(next.quaternion)
        if (entry.objectRef.current) {
          entry.objectRef.current.position.copy(next.position)
          entry.objectRef.current.quaternion.copy(next.quaternion)
        }
        entry.onUpdate?.(next)
      }
    }

    if (pinchJustEnded && state.isManipulating) {
      releaseActive()
    }
  })

  return { register, state: stateRef.current, acquireById, releaseActive }
}

function findClosestInRange(
  joints: HandJointData,
  registry: Map<string, ManipulableEntry>,
  grabDistance: number,
): string | null {
  let closestId: string | null = null
  let closestDist = Infinity

  for (const [id, entry] of registry) {
    const dist = distancePointToObb(
      joints.thumbTipPosition,
      entry.position,
      entry.quaternion,
      entry.hitHalfExtents,
    )
    if (dist > grabDistance) continue
    if (dist < closestDist) {
      closestDist = dist
      closestId = id
    }
  }
  return closestId
}
