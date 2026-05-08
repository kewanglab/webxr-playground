import { useLayoutEffect, useRef } from 'react'
import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { button, useControls } from 'leva'
import type {
  OrthographicCamera as ThreeOrthographicCamera,
  PerspectiveCamera,
} from 'three'
import {
  readCaptureViewId,
  readDirectorPresetId,
} from '../../app/captureOptions'
import { usePlaygroundStore } from '../../app/store'
import { useXRMode } from './hooks'
import { HEADSET_VIEW, LAB_CAMERA_VIEWS, type CameraView } from './labCameraViews'
import { DirectorCamera } from '../../cinematics/DirectorCamera'

/**
 * Desktop-only authored camera framing so lab composition remains reviewable
 * outside the headset. XR sessions manage their own view transform.
 *
 * The default `headset` view exposes live Leva controls so designers can
 * dial position / yaw / pitch / FOV at runtime; the authored capture views
 * (`hero`, `side`, `overhead`, `wide`) stay static so visual regression
 * captures remain deterministic.
 */
export function DesktopPreviewCamera() {
  const currentLab = usePlaygroundStore((s) => s.currentLab)
  const captureViewId = readCaptureViewId()
  const directorPresetId = readDirectorPresetId()
  const mode = useXRMode()
  const view = LAB_CAMERA_VIEWS[currentLab][captureViewId]

  if (mode != null) return null
  // Director mode owns the camera and lab switching while active. It always
  // outputs a perspective camera, so it co-exists with the headset/hero/etc.
  // capture views by simply taking precedence when the URL flag is set.
  if (directorPresetId) return <DirectorCamera presetId={directorPresetId} />
  if (captureViewId === 'headset') return <HeadsetPerspectiveCamera />
  if (view.orthographicZoom) return <DesktopOrthographicCamera view={view} />

  return <DesktopPerspectiveCamera view={view} />
}

/**
 * Convert a `(position → target)` lookAt pair into yaw / pitch degrees.
 *  - yaw   = 0° → looking down -Z; +90° → looking along -X; -90° → +X.
 *  - pitch = 0° → horizontal; +90° → up; -90° → down.
 */
function deriveYawPitchDeg(
  position: [number, number, number],
  target: [number, number, number],
): { yaw: number; pitch: number } {
  const dx = target[0] - position[0]
  const dy = target[1] - position[1]
  const dz = target[2] - position[2]
  const yaw = (Math.atan2(dx, -dz) * 180) / Math.PI
  const pitch = (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI
  return { yaw, pitch }
}

const HEADSET_DEFAULTS = (() => {
  const { yaw, pitch } = deriveYawPitchDeg(HEADSET_VIEW.position, HEADSET_VIEW.target)
  return {
    posX: HEADSET_VIEW.position[0],
    posY: HEADSET_VIEW.position[1],
    posZ: HEADSET_VIEW.position[2],
    yawDeg: yaw,
    pitchDeg: pitch,
    fov: HEADSET_VIEW.fov,
  }
})()

/**
 * Headset-view perspective camera with live Leva controls. Position is xyz in
 * world meters; yaw/pitch in degrees rotate the look direction around the
 * camera's own up/right axes. The Reset button restores `HEADSET_VIEW` —
 * single source of truth, so changing the constant updates the reset target.
 */
function HeadsetPerspectiveCamera() {
  const { camera } = useThree()

  const [values, set] = useControls('Camera', () => ({
    posX: { value: HEADSET_DEFAULTS.posX, min: -10, max: 10, step: 0.05, label: 'pos x' },
    posY: { value: HEADSET_DEFAULTS.posY, min: 0, max: 5, step: 0.05, label: 'pos y' },
    posZ: { value: HEADSET_DEFAULTS.posZ, min: -20, max: 5, step: 0.05, label: 'pos z' },
    yawDeg: { value: HEADSET_DEFAULTS.yawDeg, min: -180, max: 180, step: 1, label: 'yaw °' },
    pitchDeg: { value: HEADSET_DEFAULTS.pitchDeg, min: -89, max: 89, step: 1, label: 'pitch °' },
    fov: { value: HEADSET_DEFAULTS.fov, min: 30, max: 150, step: 1 },
    reset: button(() => set(HEADSET_DEFAULTS)),
  }))

  useLayoutEffect(() => {
    const persp = camera as PerspectiveCamera
    persp.position.set(values.posX, values.posY, values.posZ)
    persp.up.set(0, 1, 0)
    persp.fov = values.fov
    persp.far = 300
    const yaw = (values.yawDeg * Math.PI) / 180
    const pitch = (values.pitchDeg * Math.PI) / 180
    const dx = Math.sin(yaw) * Math.cos(pitch)
    const dy = Math.sin(pitch)
    const dz = -Math.cos(yaw) * Math.cos(pitch)
    persp.lookAt(values.posX + dx, values.posY + dy, values.posZ + dz)
    persp.updateProjectionMatrix()
    persp.updateMatrixWorld()
  }, [
    camera,
    values.posX,
    values.posY,
    values.posZ,
    values.yawDeg,
    values.pitchDeg,
    values.fov,
  ])

  return null
}

function DesktopPerspectiveCamera({ view }: { view: CameraView }) {
  const { camera } = useThree()

  useLayoutEffect(() => {
    const perspective = camera as PerspectiveCamera
    perspective.position.set(...view.position)
    perspective.up.set(...(view.up ?? [0, 1, 0]))
    perspective.fov = view.fov
    // The skydome sits at radius 130 m — well beyond the App's default `far: 80`.
    // Without bumping far here, the back of the dome falls behind the far clipping
    // plane and renders incorrectly (or not at all), making the sky gradient look
    // like a curved silhouette of "what fits inside 80 m" instead of the whole sky.
    perspective.far = 300
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
