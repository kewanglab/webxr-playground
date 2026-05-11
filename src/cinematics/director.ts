import type { LabId } from '../config/labs'
import type { CaptureViewId } from '../app/captureOptions'
import type { PlaygroundPresetId } from '../config/playgroundTheme'

export type Easing =
  | 'linear'
  | 'easeInOutCubic'
  | 'easeOutExpo'
  | 'easeInOutQuart'

export type Keyframe = {
  /** Active lab during this keyframe; switching here triggers a store cut. */
  lab: LabId
  /** Optional named base view (resolved against `LAB_CAMERA_VIEWS`). */
  view?: CaptureViewId
  posX?: number
  posY?: number
  posZ?: number
  yawDeg?: number
  pitchDeg?: number
  fov?: number
  /**
   * Optional override for the tween's *starting* pose. By default each
   * keyframe's tween runs from the previous keyframe's resolved end pose;
   * when these `from*` fields are set, they override that on a per-axis basis.
   *
   * Use case: cutting between scenes where the world geometry changes
   * (different arch positions per lab). Setting `fromPosZ` lets the new
   * keyframe teleport its starting pose into the new geometry's frame so
   * the *relative* path through arch-space remains continuous, even though
   * the world-space path is discontinuous at the cut.
   */
  fromPosX?: number
  fromPosY?: number
  fromPosZ?: number
  fromYawDeg?: number
  fromPitchDeg?: number
  fromFov?: number
  /** ms to interpolate from the previous keyframe's resolved state to this one. 0 = hard cut. */
  tweenMs: number
  /** ms to remain on this state after the tween completes. */
  holdMs: number
  ease?: Easing
  caption?: string
  /**
   * When true, the caption ignores the fade-overlay's auto-suppress (which
   * normally hides the caption while the dip-to-black is mostly opaque).
   * Used for captions that should sit on top of inter-scene blackouts —
   * e.g. a title that persists across multiple establishing shots while
   * the screen dips between them.
   */
  captionPersistent?: boolean
  /**
   * When > 0, the screen starts black at the start of this keyframe and fades
   * to clear over `fadeInMs`. Runs concurrently with any incoming tween so the
   * camera can already be moving while the dip-to-black resolves — that
   * preserves continuity through cut transitions.
   */
  fadeInMs?: number
  /**
   * When > 0, the screen fades from clear to black over the LAST `fadeOutMs`
   * of the trailing hold. Pair with the next keyframe's `fadeInMs` for a
   * "dip to black" cut between scenes.
   */
  fadeOutMs?: number
  /**
   * When set and different from the prior keyframe, calls `setThemePresetId`
   * at the start of this keyframe. Theme transitions are instant (the shell
   * + scene tokens swap on the next render); pair with `fadeInMs` if you want
   * the swap to land while the screen is dark.
   */
  themePresetId?: PlaygroundPresetId
  /** Internal label for debugging / burn-in. */
  shot?: string
}

export type ResolvedKeyframe = {
  lab: LabId
  posX: number
  posY: number
  posZ: number
  yawDeg: number
  pitchDeg: number
  fov: number
  /** Resolved tween start pose — usually inherited from previous keyframe's
   * end, optionally overridden per-axis via `from*` fields on the source. */
  fromPosX: number
  fromPosY: number
  fromPosZ: number
  fromYawDeg: number
  fromPitchDeg: number
  fromFov: number
  tweenMs: number
  holdMs: number
  ease: Easing
  caption: string | null
  captionPersistent: boolean
  fadeInMs: number
  fadeOutMs: number
  themePresetId: PlaygroundPresetId | null
  shot: string
}

export const easings: Record<Easing, (t: number) => number> = {
  linear: (t) => t,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutQuart: (t) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,
}

/** Shortest-arc lerp for yaw degrees (handles 350° → 10° wrap). */
export function lerpYawDeg(a: number, b: number, t: number): number {
  const diff = ((((b - a) % 360) + 540) % 360) - 180
  return a + diff * t
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * Convert a `(position → target)` lookAt pair into yaw / pitch degrees, mirroring
 * the convention used by `DesktopPreviewCamera` so authored views resolve to the
 * same angles whether they came from a named view or explicit overrides.
 */
export function deriveYawPitchDeg(
  position: [number, number, number],
  target: [number, number, number],
): { yawDeg: number; pitchDeg: number } {
  const dx = target[0] - position[0]
  const dy = target[1] - position[1]
  const dz = target[2] - position[2]
  const yawDeg = (Math.atan2(dx, -dz) * 180) / Math.PI
  const pitchDeg = (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI
  return { yawDeg, pitchDeg }
}
