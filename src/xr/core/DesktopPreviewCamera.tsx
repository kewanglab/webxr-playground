import { useLayoutEffect, useRef } from 'react'
import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import type {
  OrthographicCamera as ThreeOrthographicCamera,
  PerspectiveCamera,
} from 'three'
import type { LabId } from '../../config/labs'
import { readCaptureViewId, type CaptureViewId } from '../../app/captureOptions'
import { usePlaygroundStore } from '../../app/store'
import { useXRMode } from './hooks'

type CameraView = {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  up?: [number, number, number]
  rotation?: [number, number, number]
  orthographicZoom?: number
}

const LAB_CAMERA_VIEWS: Record<LabId, Record<CaptureViewId, CameraView>> = {
  selection: {
    hero: {
      position: [0, 1.72, 4.8],
      target: [0, 1.18, -1.55],
      fov: 36,
    },
    side: {
      position: [3.1, 1.75, 2.4],
      target: [0, 1.05, -1.4],
      fov: 42,
    },
    overhead: {
      position: [0, 10, -1.48],
      target: [0, 0, -1.48],
      fov: 48,
      rotation: [-Math.PI / 2, 0, 0],
      orthographicZoom: 170,
    },
    wide: {
      position: [0, 2.1, 6.4],
      target: [0, 1.1, -1.4],
      fov: 46,
    },
  },
  placement: {
    hero: {
      position: [0, 1.5, 3.9],
      target: [0, 1.15, -1.2],
      fov: 40,
    },
    side: {
      position: [2.55, 1.6, 2.15],
      target: [0, 1.08, -1.05],
      fov: 43,
    },
    overhead: {
      position: [0, 9, -1.05],
      target: [0, 0, -1.05],
      fov: 48,
      rotation: [-Math.PI / 2, 0, 0],
      orthographicZoom: 165,
    },
    wide: {
      position: [0, 1.85, 5.4],
      target: [0, 1.05, -1.05],
      fov: 48,
    },
  },
  locomotion: {
    hero: {
      position: [0, 1.95, 5.8],
      target: [0, 1.1, -7.4],
      fov: 34,
    },
    side: {
      position: [4.2, 2.05, 2.4],
      target: [0, 1.0, -6.2],
      fov: 42,
    },
    overhead: {
      position: [0, 14, -5.2],
      target: [0, 0, -5.2],
      fov: 52,
      rotation: [-Math.PI / 2, 0, 0],
      orthographicZoom: 92,
    },
    wide: {
      position: [0, 2.35, 8.2],
      target: [0, 1.0, -7.0],
      fov: 44,
    },
  },
  manipulation: {
    hero: {
      position: [0.85, 1.55, 2.1],
      target: [0, 1.2, -0.85],
      fov: 38,
    },
    side: {
      position: [2.45, 1.62, 0.35],
      target: [0, 1.08, -0.78],
      fov: 42,
    },
    overhead: {
      position: [0, 9, -0.78],
      target: [0, 0, -0.78],
      fov: 48,
      rotation: [-Math.PI / 2, 0, 0],
      orthographicZoom: 175,
    },
    wide: {
      position: [0.35, 1.95, 4.4],
      target: [0, 1.06, -0.78],
      fov: 48,
    },
  },
}

/**
 * Desktop-only authored camera framing so lab composition remains reviewable
 * outside the headset. XR sessions manage their own view transform.
 */
export function DesktopPreviewCamera() {
  const currentLab = usePlaygroundStore((s) => s.currentLab)
  const captureViewId = readCaptureViewId()
  const mode = useXRMode()
  const view = LAB_CAMERA_VIEWS[currentLab][captureViewId]

  if (mode != null) return null
  if (view.orthographicZoom) return <DesktopOrthographicCamera view={view} />

  return <DesktopPerspectiveCamera view={view} />
}

function DesktopPerspectiveCamera({ view }: { view: CameraView }) {
  const { camera } = useThree()

  useLayoutEffect(() => {
    const perspective = camera as PerspectiveCamera
    perspective.position.set(...view.position)
    perspective.up.set(...(view.up ?? [0, 1, 0]))
    perspective.fov = view.fov
    perspective.lookAt(...view.target)
    perspective.updateProjectionMatrix()
    perspective.updateMatrixWorld()
  }, [camera, view])

  return null
}

function DesktopOrthographicCamera({ view }: { view: CameraView }) {
  const ref = useRef<ThreeOrthographicCamera>(null)

  useLayoutEffect(() => {
    const camera = ref.current
    if (!camera) return
    camera.position.set(...view.position)
    camera.zoom = view.orthographicZoom ?? 1
    if (view.rotation) camera.rotation.set(...view.rotation)
    else {
      camera.up.set(...(view.up ?? [0, 1, 0]))
      camera.lookAt(...view.target)
    }
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }, [view])

  return <OrthographicCamera ref={ref} makeDefault near={0.1} far={100} />
}
