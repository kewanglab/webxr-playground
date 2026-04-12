import { useFrame, useThree } from '@react-three/fiber'
import { useCallback, useRef } from 'react'
import { Object3D, Quaternion, Vector3 } from 'three'
import type { ManipulationTechnique } from '../ObjectManipulationLab'
import type { HandJointData } from './useHandJoints'
import {
  type AcquisitionSnapshot,
  type ManipulationResult,
  computeManipulation,
  createAcquisitionSnapshot,
  estimateShoulderPosition,
  isWithinGrabRange,
  rayHitsObject,
} from './techniques'

export type ManipulableEntry = {
  id: string
  objectRef: { current: Object3D | null }
  position: Vector3
  quaternion: Quaternion
  hitRadius: number
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
  technique: ManipulationTechnique
  joints: HandJointData
  cdGain: number
  grabDistance: number
  shoulderOffset: [number, number, number]
  onAcquire?: (id: string) => void
  onRelease?: (id: string, result: ManipulationResult) => void
}

/**
 * Manages the acquire → manipulate → release cycle.
 * Register manipulable objects, then call useFrame-based updates automatically.
 */
export function useManipulation(options: UseManipulationOptions) {
  const { technique, joints, cdGain, grabDistance, shoulderOffset, onAcquire, onRelease } = options
  const { camera } = useThree()

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

  useFrame(() => {
    if (!joints.isTracking) return
    const state = stateRef.current
    const pinchJustStarted = joints.isPinching && !wasPinching.current
    const pinchJustEnded = !joints.isPinching && wasPinching.current
    wasPinching.current = joints.isPinching

    if (pinchJustStarted && !state.isManipulating) {
      const hit = findAcquisitionTarget(
        technique,
        joints,
        registryRef.current,
        grabDistance,
        camera.position,
        shoulderOffset,
      )
      if (hit) {
        const entry = registryRef.current.get(hit)!
        snapRef.current = createAcquisitionSnapshot(
          joints,
          entry.position,
          entry.quaternion,
          technique,
          camera.position,
          shoulderOffset,
        )
        activeIdRef.current = hit
        state.isManipulating = true
        state.targetId = hit
        onAcquire?.(hit)
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
          camera.position,
          shoulderOffset,
        )
        entry.position.copy(result.position)
        entry.quaternion.copy(result.quaternion)
        if (entry.objectRef.current) {
          entry.objectRef.current.position.copy(result.position)
          entry.objectRef.current.quaternion.copy(result.quaternion)
        }
      }
    }

    if (pinchJustEnded && state.isManipulating) {
      const entry = registryRef.current.get(activeIdRef.current!)
      if (entry) {
        onRelease?.(activeIdRef.current!, {
          position: entry.position.clone(),
          quaternion: entry.quaternion.clone(),
        })
      }
      snapRef.current = null
      activeIdRef.current = null
      state.isManipulating = false
      state.targetId = null
    }
  })

  return { register, state: stateRef.current }
}

function findAcquisitionTarget(
  technique: ManipulationTechnique,
  joints: HandJointData,
  registry: Map<string, ManipulableEntry>,
  grabDistance: number,
  headPosition: Vector3,
  shoulderOffset: [number, number, number],
): string | null {
  const isRayTechnique = technique === 'HRI' || technique === 'HRS'

  let rayOrigin: Vector3 | undefined
  let rayDir: Vector3 | undefined

  if (isRayTechnique) {
    if (technique === 'HRI') {
      rayOrigin = joints.wristPosition
      rayDir = new Vector3(0, 0, -1).applyQuaternion(joints.wristQuaternion)
    } else {
      rayOrigin = estimateShoulderPosition(headPosition, joints.wristPosition, shoulderOffset)
      rayDir = new Vector3().subVectors(joints.wristPosition, rayOrigin).normalize()
    }
  }

  let closestId: string | null = null
  let closestDist = Infinity

  for (const [id, entry] of registry) {
    let dist: number
    if (isRayTechnique) {
      if (!rayHitsObject(rayOrigin!, rayDir!, entry.position, entry.hitRadius)) continue
      dist = entry.position.distanceTo(rayOrigin!)
    } else {
      dist = joints.thumbTipPosition.distanceTo(entry.position)
      if (dist > grabDistance) continue
    }
    if (dist < closestDist) {
      closestDist = dist
      closestId = id
    }
  }
  return closestId
}
