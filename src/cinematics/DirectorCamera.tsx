import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { PerspectiveCamera } from 'three'
import { usePlaygroundStore } from '../app/store'
import { readDirectorPaused, readDirectorSeek } from '../app/captureOptions'
import {
  HEADSET_VIEW,
  LAB_CAMERA_VIEWS,
} from '../xr/core/labCameraViews'
import {
  deriveYawPitchDeg,
  easings,
  lerp,
  lerpYawDeg,
  type Keyframe,
  type ResolvedKeyframe,
} from './director'
import { getDirectorPreset } from './presets'
import { useDirectorStore } from './directorStore'

/**
 * Resolve a keyframe's optional `view` + overrides into concrete camera state.
 * Position falls through view → explicit → previous-keyframe in that order so
 * authoring stays terse: most keyframes only specify the named view.
 */
function resolveKeyframe(
  kf: Keyframe,
  prev: ResolvedKeyframe | null,
): ResolvedKeyframe {
  const named = kf.view ? LAB_CAMERA_VIEWS[kf.lab][kf.view] : null
  const baseYawPitch = named
    ? deriveYawPitchDeg(named.position, named.target)
    : null

  const fallback = prev ?? {
    posX: HEADSET_VIEW.position[0],
    posY: HEADSET_VIEW.position[1],
    posZ: HEADSET_VIEW.position[2],
    yawDeg: 0,
    pitchDeg: 0,
    fov: HEADSET_VIEW.fov,
  }

  const posX = kf.posX ?? named?.position[0] ?? fallback.posX
  const posY = kf.posY ?? named?.position[1] ?? fallback.posY
  const posZ = kf.posZ ?? named?.position[2] ?? fallback.posZ
  const yawDeg = kf.yawDeg ?? baseYawPitch?.yawDeg ?? fallback.yawDeg
  const pitchDeg = kf.pitchDeg ?? baseYawPitch?.pitchDeg ?? fallback.pitchDeg
  const fov = kf.fov ?? named?.fov ?? fallback.fov

  return {
    lab: kf.lab,
    posX,
    posY,
    posZ,
    yawDeg,
    pitchDeg,
    fov,
    // `from*` start-of-tween pose: explicit override → previous keyframe's
    // resolved end → this keyframe's own end (i.e. zero-distance tween fallback).
    fromPosX: kf.fromPosX ?? prev?.posX ?? posX,
    fromPosY: kf.fromPosY ?? prev?.posY ?? posY,
    fromPosZ: kf.fromPosZ ?? prev?.posZ ?? posZ,
    fromYawDeg: kf.fromYawDeg ?? prev?.yawDeg ?? yawDeg,
    fromPitchDeg: kf.fromPitchDeg ?? prev?.pitchDeg ?? pitchDeg,
    fromFov: kf.fromFov ?? prev?.fov ?? fov,
    tweenMs: kf.tweenMs,
    holdMs: kf.holdMs,
    ease: kf.ease ?? 'easeInOutCubic',
    caption: kf.caption ?? null,
    fadeInMs: kf.fadeInMs ?? 0,
    fadeOutMs: kf.fadeOutMs ?? 0,
    themePresetId: kf.themePresetId ?? null,
    shot: kf.shot ?? `kf-${kf.lab}`,
  }
}

function resolveTimeline(keyframes: Keyframe[]): ResolvedKeyframe[] {
  const out: ResolvedKeyframe[] = []
  for (const kf of keyframes) {
    out.push(resolveKeyframe(kf, out[out.length - 1] ?? null))
  }
  return out
}

type ActiveSegment = {
  /** index of the keyframe being approached (the destination of the tween). */
  index: number
  /** ms elapsed since this segment started. */
  elapsed: number
}

/**
 * Compute the fade overlay opacity for the current frame.
 *
 * Each keyframe declares optional fade *windows*:
 *   - `fadeInMs > 0`: during the first `fadeInMs` of the segment, lerp 1 → 0.
 *   - `fadeOutMs > 0`: during the last `fadeOutMs` of the trailing hold, lerp 0 → 1.
 *
 * Outside both windows, opacity *persists* at the prior value rather than
 * snapping to clear. This is what lets dip-to-black transitions span multiple
 * keyframes — a "snap to deep camera position" keyframe with no fade declared
 * stays black if it follows a `fadeOutMs` segment, then the next keyframe's
 * `fadeInMs` reveals the new scene.
 */
function computeFadeOpacity(
  elapsedMs: number,
  segmentTotalMs: number,
  fadeInMs: number,
  fadeOutMs: number,
  persisted: number,
): number {
  if (fadeInMs > 0 && elapsedMs < fadeInMs) {
    return Math.min(1, Math.max(0, 1 - elapsedMs / fadeInMs))
  }
  if (fadeOutMs > 0 && elapsedMs > segmentTotalMs - fadeOutMs) {
    const out = (elapsedMs - (segmentTotalMs - fadeOutMs)) / fadeOutMs
    return Math.min(1, Math.max(0, out))
  }
  // Outside both windows: hold prior value. After a completed fadeIn this is 0;
  // after a completed fadeOut it's 1; for keyframes that declare no fade at all
  // it carries through the previous segment's resolved opacity.
  return persisted
}

/**
 * Drives the desktop camera through an authored keyframe timeline and switches
 * the active lab via the playground store as each keyframe begins. Mounted via
 * `DesktopPreviewCamera` when `?director=<id>` is present in the URL.
 *
 * Timing model: each keyframe owns its incoming tween (from previous resolved
 * state to its own target) plus a trailing hold. The first keyframe has no
 * incoming tween — its `tweenMs` is ignored and the camera snaps to it on
 * mount. The final keyframe holds indefinitely (no looping) so screen
 * recordings end on a held final frame.
 */
export function DirectorCamera({ presetId }: { presetId: string }) {
  const preset = useMemo(() => getDirectorPreset(presetId), [presetId])
  const timeline = useMemo(
    () => (preset ? resolveTimeline(preset) : []),
    [preset],
  )

  const { camera } = useThree()
  const setLab = usePlaygroundStore((s) => s.setLab)
  const setThemePresetId = usePlaygroundStore((s) => s.setThemePresetId)
  const setCaption = useDirectorStore((s) => s.setCaption)
  const setFadeOpacity = useDirectorStore((s) => s.setFadeOpacity)

  // Mutable timeline cursor — kept in a ref so re-renders don't reset playback.
  const segment = useRef<ActiveSegment>({ index: 0, elapsed: 0 })
  const lastLabRef = useRef<string | null>(null)
  const lastCaptionRef = useRef<string | null | undefined>(undefined)
  const lastThemeRef = useRef<string | null>(null)
  // Persisted fade opacity — lets dip-to-black transitions span keyframes.
  const fadeRef = useRef(0)

  // Snap to the seek target (or keyframe 0) on mount and clear caption/fade on unmount.
  useEffect(() => {
    if (timeline.length === 0) return
    const seek = readDirectorSeek()
    const startIndex =
      seek != null ? Math.min(seek, timeline.length - 1) : 0
    const first = timeline[startIndex]
    setLab(first.lab)
    lastLabRef.current = first.lab
    // Apply the most recent themePresetId up to and including this keyframe.
    // Required because seeking jumps in mid-timeline; without this, theme
    // state persists from prior playback (the playground store mirrors theme
    // to localStorage). Walks backward from `startIndex` and picks the first
    // keyframe that explicitly declares a theme.
    let resolvedTheme: string | null = null
    for (let i = startIndex; i >= 0; i--) {
      if (timeline[i].themePresetId) {
        resolvedTheme = timeline[i].themePresetId
        break
      }
    }
    if (resolvedTheme) {
      setThemePresetId(resolvedTheme)
      lastThemeRef.current = resolvedTheme
    }
    applyCameraState(camera as PerspectiveCamera, first)
    setCaption(first.caption)
    lastCaptionRef.current = first.caption
    // Initial fade state:
    //  - Cold start (seek=0 or no seek) on a *fade-managed* timeline (any
    //    keyframe declares fadeInMs/fadeOutMs > 0) → start fully black so
    //    the first declared fade reveals the scene cleanly. This covers the
    //    common pattern where a "deep snap" KF0 sits with no fade and the
    //    actual reveal happens on KF1 — the screen needs to be black through
    //    KF0 for the snap to be hidden.
    //  - Cold start on a timeline with no fades → start clear (legacy
    //    behavior for concepts that author hard cuts only).
    //  - Seek into the middle/end of a clip → land in the clear "held" state
    //    (after fadeIn, before fadeOut) so the shot is reviewable without
    //    needing to wait for the fadeIn to play.
    const isColdStart = startIndex === 0
    const timelineHasFade = timeline.some(
      (kf) => kf.fadeInMs > 0 || kf.fadeOutMs > 0,
    )
    // Cold start on a fade-managed timeline → black; cold start on a
    // hard-cut timeline → clear; seek (review) → always clear so the shot
    // is visible regardless of where in the segment you've landed.
    const initialOpacity = isColdStart && timelineHasFade ? 1 : 0
    fadeRef.current = initialOpacity
    setFadeOpacity(initialOpacity)
    // Force-clear fade for paused seeks so we can review the destination
    // pose unblocked by the segment's fadeOut window. The next play tick
    // (when unpause / next seek) will recompute from scratch.
    if (!isColdStart && readDirectorPaused()) {
      fadeRef.current = 0
      setFadeOpacity(0)
    }
    // When seeking past keyframe 0, land at end-of-tween so the camera sits
    // at the keyframe's destination pose, and force fade clear so segments
    // whose fadeOut window overlaps the tween (i.e. `holdMs: 0`) still show
    // the destination instead of black.
    segment.current = {
      index: startIndex,
      elapsed: isColdStart ? 0 : first.tweenMs,
    }
    return () => {
      setCaption(null)
      setFadeOpacity(0)
    }
  }, [timeline, camera, setLab, setThemePresetId, setCaption, setFadeOpacity])

  const paused = useMemo(() => readDirectorPaused(), [])

  useFrame((_state, deltaSec) => {
    if (timeline.length === 0) return
    if (paused) return
    const seg = segment.current
    seg.elapsed += deltaSec * 1000

    const current = timeline[seg.index]
    const isFirst = seg.index === 0
    const tween = isFirst ? 0 : current.tweenMs
    const total = tween + current.holdMs

    const opacity = computeFadeOpacity(
      seg.elapsed,
      total,
      current.fadeInMs,
      current.fadeOutMs,
      fadeRef.current,
    )
    fadeRef.current = opacity
    setFadeOpacity(opacity)

    // First keyframe is a snap, only its hold counts.
    if (isFirst) {
      if (seg.elapsed >= current.holdMs && timeline.length > 1) {
        seg.index = 1
        seg.elapsed = 0
        enterKeyframe(timeline[1], {
          setLab,
          setThemePresetId,
          setCaption,
          lastLabRef,
          lastThemeRef,
          lastCaptionRef,
        })
      }
      return
    }

    if (seg.elapsed < tween) {
      const t = tween > 0 ? seg.elapsed / tween : 1
      const eased = easings[current.ease](Math.min(1, Math.max(0, t)))
      // Tween source is the keyframe's resolved `from` pose (which itself
      // defaults to the previous keyframe's end). This means a keyframe can
      // override its starting pose to teleport into a new geometry frame
      // without the tween smearing across the world-space discontinuity.
      tweenCamera(camera as PerspectiveCamera, current, eased)
      return
    }

    // Tween done — make sure final state is exact, then hold.
    applyCameraState(camera as PerspectiveCamera, current)

    if (seg.elapsed >= total) {
      const next = seg.index + 1
      if (next >= timeline.length) {
        // Hold final keyframe forever — clamp elapsed so we don't overflow.
        seg.elapsed = total
        return
      }
      seg.index = next
      seg.elapsed = 0
      enterKeyframe(timeline[next], {
        setLab,
        setThemePresetId,
        setCaption,
        lastLabRef,
        lastThemeRef,
        lastCaptionRef,
      })
    }
  })

  return null
}

type EnterKeyframeDeps = {
  setLab: (lab: ResolvedKeyframe['lab']) => void
  setThemePresetId: (id: string) => void
  setCaption: (c: string | null) => void
  lastLabRef: React.MutableRefObject<string | null>
  lastThemeRef: React.MutableRefObject<string | null>
  lastCaptionRef: React.MutableRefObject<string | null | undefined>
}

function enterKeyframe(kf: ResolvedKeyframe, deps: EnterKeyframeDeps) {
  if (kf.lab !== deps.lastLabRef.current) {
    deps.setLab(kf.lab)
    deps.lastLabRef.current = kf.lab
  }
  if (kf.themePresetId && kf.themePresetId !== deps.lastThemeRef.current) {
    deps.setThemePresetId(kf.themePresetId)
    deps.lastThemeRef.current = kf.themePresetId
  }
  if (kf.caption !== deps.lastCaptionRef.current) {
    deps.setCaption(kf.caption)
    deps.lastCaptionRef.current = kf.caption
  }
}

function tweenCamera(
  camera: PerspectiveCamera,
  to: ResolvedKeyframe,
  t: number,
) {
  const posX = lerp(to.fromPosX, to.posX, t)
  const posY = lerp(to.fromPosY, to.posY, t)
  const posZ = lerp(to.fromPosZ, to.posZ, t)
  const yawDeg = lerpYawDeg(to.fromYawDeg, to.yawDeg, t)
  const pitchDeg = lerp(to.fromPitchDeg, to.pitchDeg, t)
  const fov = lerp(to.fromFov, to.fov, t)
  applyCameraState(camera, {
    ...to,
    posX,
    posY,
    posZ,
    yawDeg,
    pitchDeg,
    fov,
  })
}

function applyCameraState(camera: PerspectiveCamera, kf: ResolvedKeyframe) {
  camera.position.set(kf.posX, kf.posY, kf.posZ)
  camera.up.set(0, 1, 0)
  camera.fov = kf.fov
  camera.far = 300
  const yaw = (kf.yawDeg * Math.PI) / 180
  const pitch = (kf.pitchDeg * Math.PI) / 180
  const dx = Math.sin(yaw) * Math.cos(pitch)
  const dy = Math.sin(pitch)
  const dz = -Math.cos(yaw) * Math.cos(pitch)
  camera.lookAt(kf.posX + dx, kf.posY + dy, kf.posZ + dz)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}
