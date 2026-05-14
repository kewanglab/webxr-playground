import type { LabId } from '../../config/labs'
import type { CaptureViewId } from '../../app/captureOptions'

export type CameraView = {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
  up?: [number, number, number]
  rotation?: [number, number, number]
  orthographicZoom?: number
}

/**
 * First-person Quest 3 framing shared by all labs: standing eye height,
 * pulled back slightly from the XR origin and tilted just below horizontal
 * so the desktop preview reads as "the user looking at the lab content"
 * rather than "the user staring at the sky".
 *
 * - Position: (0, 1.46, 0.15) — slightly below eye height to feel like a
 *             seated/relaxed POV, pulled back 0.15 m from the strict XR
 *             origin so foreground lab content doesn't fill half the view.
 * - Target:   (0, 1.32, -0.84) — yields yaw=0°, pitch≈-8° in the leva
 *             camera controls (looking forward + slight downward tilt),
 *             which centers the table-height interaction zone in the frame.
 * - FOV:      100° vertical — slightly wider than Quest 3's ~96°V per eye.
 *             three.js uses vertical FOV and derives horizontal from canvas
 *             aspect, so 100°V at ~1.5:1 aspect gives ~125°H, in the
 *             ballpark of perceived headset peripheral vision.
 */
export const HEADSET_VIEW: CameraView = {
  position: [0, 1.46, 0.15],
  target: [0, 1.32, -0.84],
  fov: 100,
}

export const LAB_CAMERA_VIEWS: Record<LabId, Record<CaptureViewId, CameraView>> = {
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
  microgesture: {
    headset: HEADSET_VIEW,
    hero: {
      position: [0, 1.7, 4.4],
      target: [0, 1.4, -2.2],
      fov: 38,
    },
    side: {
      position: [2.9, 1.65, 1.6],
      target: [0, 1.45, -2.0],
      fov: 42,
    },
    overhead: {
      position: [0, 10, -2.1],
      target: [0, 0, -2.1],
      fov: 48,
      rotation: [-Math.PI / 2, 0, 0],
      orthographicZoom: 165,
    },
    wide: {
      position: [0, 2.1, 5.8],
      target: [0, 1.4, -2.2],
      fov: 46,
    },
  },
}
