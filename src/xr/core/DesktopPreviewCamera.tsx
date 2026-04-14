import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import type { LabId } from '../../config/labs'
import { usePlaygroundStore } from '../../app/store'
import { useXRMode } from './hooks'

type CameraView = {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

const LAB_CAMERA_VIEWS: Record<LabId, CameraView> = {
  selection: {
    position: [0, 1.72, 4.8],
    target: [0, 1.18, -1.55],
    fov: 36,
  },
  placement: {
    position: [0, 1.5, 3.9],
    target: [0, 1.15, -1.2],
    fov: 40,
  },
  locomotion: {
    position: [0, 1.95, 5.8],
    target: [0, 1.1, -7.4],
    fov: 34,
  },
  manipulation: {
    position: [0.85, 1.55, 2.1],
    target: [0, 1.2, -0.85],
    fov: 38,
  },
}

/**
 * Desktop-only authored camera framing so lab composition remains reviewable
 * outside the headset. XR sessions manage their own view transform.
 */
export function DesktopPreviewCamera() {
  const currentLab = usePlaygroundStore((s) => s.currentLab)
  const mode = useXRMode()
  const { camera } = useThree()

  useLayoutEffect(() => {
    if (mode != null) return
    const view = LAB_CAMERA_VIEWS[currentLab]
    const perspective = camera as PerspectiveCamera
    perspective.position.set(...view.position)
    perspective.fov = view.fov
    perspective.lookAt(...view.target)
    perspective.updateProjectionMatrix()
    perspective.updateMatrixWorld()
  }, [camera, currentLab, mode])

  return null
}
