import { useLayoutEffect, useRef } from 'react'
import { OrthographicCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { button, useControls } from 'leva'
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

/**
 * First-person Quest 3 framing shared by all labs: standing eye height,
 * looking forward, with a small step back from the strict XR origin.
 *
 * - Position: (0, 1.66, 0.2) — eye height matches `DEFAULT_STANDING_EYE_HEIGHT_M`,
 *             pulled back 0.2 m from the strict XR origin so foreground lab
 *             content (e.g. Selection lab's pinch/touch orbs at z=-0.55)
 *             doesn't fill half the desktop view. The small standoff lets the
 *             orbs sit inside the arch silhouette without making the framing
 *             feel like a third-person showcase shot.
 * - Target:   (0, 1.66, -1) — straight forward from eye level.
 * - FOV:      100° vertical — slightly wider than Quest 3's ~96°V per eye.
 *             three.js uses vertical FOV and derives horizontal from canvas
 *             aspect, so 100°V at ~1.5:1 aspect gives ~125°H, in the
 *             ballpark of perceived headset peripheral vision.
 */
const HEADSET_VIEW: CameraView = {
  position: [0, 1.66, 0.2],
  target: [0, 1.66, -1],
  fov: 100,
}

const LAB_CAMERA_VIEWS: Record<LabId, Record<CaptureViewId, CameraView>> = {
  selection: {
    headset: HEADSET_VIEW,
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
    headset: HEADSET_VIEW,
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
    headset: HEADSET_VIEW,
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
    headset: HEADSET_VIEW,
    hero: {
      position: [0.75, 1.52, 3.25],
      target: [0, 1.08, -0.85],
      fov: 44,
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
 *
 * The default `headset` view exposes live Leva controls so designers can
 * dial position / yaw / pitch / FOV at runtime; the authored capture views
 * (`hero`, `side`, `overhead`, `wide`) stay static so visual regression
 * captures remain deterministic.
 */
export function DesktopPreviewCamera() {
  const currentLab = usePlaygroundStore((s) => s.currentLab)
  const captureViewId = readCaptureViewId()
  const mode = useXRMode()
  const view = LAB_CAMERA_VIEWS[currentLab][captureViewId]

  if (mode != null) return null
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
