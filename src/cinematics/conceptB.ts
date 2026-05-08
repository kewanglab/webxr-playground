import type { Keyframe } from './director'

/**
 * Concept B — "Through the Arch" reveal reel. ~14.8 s total.
 *
 * Structure:
 *   1. Establishing pull-backs for selection / placement / locomotion. Each
 *      is a pure-Z pull-back with a dip-to-black between. The selection
 *      pull-back also rides the title caption.
 *   2. Manipulation phase, in two motions that flow into one another:
 *        a. A *straight* pure-Z pull-back from manipulation deep to a point
 *           short of user origin — preserves the rhythm of the other lab
 *           pull-backs.
 *        b. A quadratic Bézier *curve* from that point through to the hero
 *           pose. The curve's control point is set so its initial tangent
 *           is along +Z, matching the straight pull-back's velocity vector.
 *           That makes the straight→curve handoff smooth (no kink, no
 *           direction change), then the curve gradually arcs into XY +
 *           pitch + yaw motion as it approaches the hero pose.
 *
 * The 4-lab cycle (manipulation → locomotion → placement → selection) and
 * the theme swap to `cloud-park` are punched in as hard cuts during the
 * second half of the curved motion. The reel lands on selection (where it
 * began), GitHub URL caption fades in over the held final pose.
 *
 * Default camera pose for the establishing pull-backs matches the
 * playground's `HEADSET_VIEW`: pos (0, 1.46, 0.15), yaw 0°, pitch ≈ -8°,
 * fov 100°.
 */

const DEFAULT_POS_Y = 1.46
const DEFAULT_PITCH = -8
const DEFAULT_FOV = 100
const DEFAULT_POS_Z = 0.15

const SCENE_FADE_MS = 300
const DEEP_HOLD_MS = 150
/** Slower, more deliberate fade at the very start (reveal from black) and very end (fade to black). */
const BOOKEND_FADE_MS = 800

/**
 * Establishing pull-back dolly speed in metres per millisecond. All three
 * pre-finale labs (selection, placement, locomotion) use this same speed so
 * the cuts between them feel rhythmically consistent — the world rushes
 * past camera at the same rate every time. Per-lab durations are derived
 * from `(deepZ − endZ) / DOLLY_SPEED` so distance and time scale together.
 *
 * 2 m/s reads as a confident establishing-shot dolly: fast enough to feel
 * intentional, slow enough that the lab content stays legible.
 */
const DOLLY_SPEED_M_PER_MS = 0.002

/**
 * Build a "deep snap" + "pull-back" pair for an establishing lab.
 *
 * Linear easing + `holdMs: 0` so the camera doesn't settle — fadeOut covers
 * the last `SCENE_FADE_MS` of the same tween while the camera is still
 * moving, and the next lab's deep snap immediately follows under cover of
 * black. `endZ` overrides the default standing-POV end pose for labs whose
 * content extends deep enough that retreating to origin would feel like an
 * unmotivated long retreat (e.g. locomotion's corridor).
 *
 * Pull-back duration is computed from the dolly distance so all three
 * establishing labs share the same speed regardless of how far each lab's
 * deep position sits behind its arch.
 */
function pullbackPair(
  lab: Keyframe['lab'],
  deepZ: number,
  endZ: number = DEFAULT_POS_Z,
  caption?: string,
  fadeOutMs: number = SCENE_FADE_MS,
  /**
   * Optional theme reset on the deep-snap keyframe. Used by the very first
   * pull-back (selection) to restore the default theme on cold start in case
   * a previous playthrough left `cloud-park` in localStorage.
   */
  themePresetId?: 'default' | 'cloud-park',
  /**
   * Override the pull-back's fadeIn. Defaults to `SCENE_FADE_MS` for the
   * mid-reel inter-lab dips; selection (the opening lab) overrides this with
   * `BOOKEND_FADE_MS` so the very first reveal from black is more deliberate.
   */
  fadeInMs: number = SCENE_FADE_MS,
): Keyframe[] {
  const pullbackMs = Math.round(Math.abs(endZ - deepZ) / DOLLY_SPEED_M_PER_MS)
  return [
    {
      shot: `${lab}-deep`,
      lab,
      themePresetId,
      posX: 0,
      posY: DEFAULT_POS_Y,
      posZ: deepZ,
      yawDeg: 0,
      pitchDeg: DEFAULT_PITCH,
      fov: DEFAULT_FOV,
      tweenMs: 0,
      holdMs: DEEP_HOLD_MS,
    },
    {
      shot: `${lab}-pullback`,
      lab,
      posX: 0,
      posY: DEFAULT_POS_Y,
      posZ: endZ,
      yawDeg: 0,
      pitchDeg: DEFAULT_PITCH,
      fov: DEFAULT_FOV,
      tweenMs: pullbackMs,
      holdMs: 0,
      ease: 'linear',
      fadeInMs,
      fadeOutMs,
      caption,
    },
  ]
}

/* ───────────────────────── Manipulation + finale path ─────────────────────────
 *
 * Two-stage path:
 *   Stage A — straight pure-Z pull-back from PATH_START to STRAIGHT_END.
 *   Stage B — quadratic Bézier from STRAIGHT_END through CURVE_CONTROL to
 *             CURVE_END. The control point shares X / Y / yaw / pitch / fov
 *             with STRAIGHT_END, so the curve's initial tangent is purely
 *             +Z — identical direction to Stage A's motion. With matching
 *             durations (see continuity math below) the two stages flow
 *             seamlessly: the camera doesn't stop at the straight→curve
 *             boundary, it just begins to bend.
 *
 * Continuity at straight→curve handoff:
 *   - Stage A velocity (linear ease):  Δz_A / D_A
 *     = (STRAIGHT_END.posZ − PATH_START.posZ) / D_A
 *   - Stage B initial velocity (linear ease, t=0):
 *     |B'(0)| × dt/dτ = 2|CONTROL − START| × (Δt_first_segment / D_first_segment)
 *   Setting these equal pins the durations relative to the geometry; with
 *   the chosen control offset (Δz = 1.5 m on both stages), Stage A duration
 *   equals Stage B's first segment duration scaled by the curve t-fraction
 *   the segment covers. Concrete numbers: STRAIGHT_MS = 2000, segments
 *   covering Δt = 0.25 of curve get 1000 ms each, segments covering
 *   Δt = 0.125 get 500 ms each — all uniform velocity along the curve.
 */
const PATH_START = {
  posX: 0,
  posY: DEFAULT_POS_Y,
  posZ: -3,
  yawDeg: 0,
  pitchDeg: DEFAULT_PITCH,
  fov: DEFAULT_FOV,
}

/** End of straight pull-back / start of Bézier curve. */
const STRAIGHT_END = {
  posX: 0,
  posY: DEFAULT_POS_Y,
  posZ: -1.5,
  yawDeg: 0,
  pitchDeg: DEFAULT_PITCH,
  fov: DEFAULT_FOV,
}

/**
 * Bézier control point. X / Y / yaw / pitch / fov match STRAIGHT_END so the
 * curve's initial tangent at t=0 is purely +Z (same direction as the
 * straight pull-back). posZ is offset toward the hero, so the curve bends
 * away from the +Z axis as t grows.
 */
const CURVE_CONTROL = {
  posX: 0,
  posY: DEFAULT_POS_Y,
  posZ: 0,
  yawDeg: 0,
  pitchDeg: DEFAULT_PITCH,
  fov: DEFAULT_FOV,
}

const CURVE_END = {
  // Hand-tuned via the in-app Leva camera controls.
  posX: 1.3,
  posY: 2.41,
  posZ: 0.1,
  yawDeg: -26,
  pitchDeg: -26,
  fov: 100,
}

/** Quadratic Bézier sample at `t ∈ [0, 1]`. */
function pathAt(t: number) {
  const u = 1 - t
  const k0 = u * u
  const k1 = 2 * u * t
  const k2 = t * t
  return {
    posX:
      k0 * STRAIGHT_END.posX +
      k1 * CURVE_CONTROL.posX +
      k2 * CURVE_END.posX,
    posY:
      k0 * STRAIGHT_END.posY +
      k1 * CURVE_CONTROL.posY +
      k2 * CURVE_END.posY,
    posZ:
      k0 * STRAIGHT_END.posZ +
      k1 * CURVE_CONTROL.posZ +
      k2 * CURVE_END.posZ,
    yawDeg:
      k0 * STRAIGHT_END.yawDeg +
      k1 * CURVE_CONTROL.yawDeg +
      k2 * CURVE_END.yawDeg,
    pitchDeg:
      k0 * STRAIGHT_END.pitchDeg +
      k1 * CURVE_CONTROL.pitchDeg +
      k2 * CURVE_END.pitchDeg,
    fov:
      k0 * STRAIGHT_END.fov + k1 * CURVE_CONTROL.fov + k2 * CURVE_END.fov,
  }
}

/**
 * Lab arch positions. Selection / Placement / Manipulation share the
 * proscenium at z = -2.5; Locomotion's arch is the goal at the far end of
 * the corridor (z = -12.2). The finale's locomotion slice offsets the
 * camera's z by the arch-z delta so the proscenium stays anchored at
 * roughly the same screen position across the lab cut.
 */
const STD_ARCH_Z = -2.5
const LOCOMOTION_ARCH_Z = -12.2
const LOCOMOTION_CAM_Z_OFFSET = LOCOMOTION_ARCH_Z - STD_ARCH_Z // -9.7

/**
 * Establishing-pull-back camera positions are defined as offsets from each
 * lab's arch, not in absolute world Z. That keeps the framing identical
 * across labs — every pull-back starts behind the arch by the same amount,
 * ends in front of it by the same amount, so the arch lands at the same
 * screen position in the same shot composition for every establishing cut.
 *   - deep   = arch_z + ESTABLISHING_DEEP_OFFSET   (1.5 m past arch)
 *   - end    = arch_z + ESTABLISHING_END_OFFSET    (2.65 m on user side)
 * For the standard arch at z = -2.5 this resolves to deep -4.0 / end 0.15
 * (the user origin); for locomotion's arch at z = -12.2 it resolves to
 * deep -13.7 / end -9.55 (mirrored framing centred on the goal arch).
 * Distance is constant across all three: 4.15 m, hence equal duration
 * under the shared `DOLLY_SPEED_M_PER_MS`.
 */
const ESTABLISHING_DEEP_OFFSET = -1.5
const ESTABLISHING_END_OFFSET = 2.65

function establishingPullback(
  lab: 'selection' | 'placement' | 'locomotion',
  archZ: number,
  caption?: string,
  themePresetId?: 'default' | 'cloud-park',
  /** Selection (the reel opener) overrides this to BOOKEND_FADE_MS. */
  fadeInMs: number = SCENE_FADE_MS,
): Keyframe[] {
  return pullbackPair(
    lab,
    archZ + ESTABLISHING_DEEP_OFFSET,
    archZ + ESTABLISHING_END_OFFSET,
    caption,
    SCENE_FADE_MS,
    themePresetId,
    fadeInMs,
  )
}

/* Curve sample t-values. Two intermediate points in the manipulation-default
 * portion (t=0.25, 0.5) so the camera traces the bend instead of cutting
 * across it as a chord. The lab cycle samples (0.625, 0.75, 0.875, 1.0)
 * each cover Δt=0.125 — equal time slices read as constant pacing. */
const T_QUARTER = 0.25
const T_HALF = 0.5
const T_THEMED = 0.625
const T_LOCOMOTION = 0.75
const T_PLACEMENT = 0.875
const T_HERO = 1.0

/* Duration constants chosen for uniform velocity:
 *   - STRAIGHT_MS / Δz_straight = LAB_QUARTER_MS / Δt_curve_at_quarter (= 0.25)
 *   - which gives LAB_QUARTER_MS = 1000 when STRAIGHT_MS = 2000 (Δz=1.5)
 *   - Δt=0.125 segments scale to 500 ms.
 * Total camera motion: 2000 + 1000*2 + 500*4 = 6000 ms. */
const STRAIGHT_MS = 2000
const CURVE_QUARTER_MS = 1000
const LAB_SLICE_MS = 500
const FINALE_HOLD_MS = 2000

export const conceptB: Keyframe[] = [
  // ───────── Establishing pull-backs ─────────

  // Selection — first lab + title card. Pull-back is anchored to the
  // proscenium arch (`STD_ARCH_Z`), shared with placement; the
  // `establishingPullback` helper applies the same arch-relative deep + end
  // offsets to every establishing lab so the arch lands at the same screen
  // position in the same shot composition for every cut. `themePresetId:
  // 'default'` resets the theme on cold start (the playground store mirrors
  // theme to localStorage); `BOOKEND_FADE_MS` makes the very first reveal
  // from black slightly more deliberate than the mid-reel dips.
  ...establishingPullback(
    'selection',
    STD_ARCH_Z,
    'WebXR Interaction Playground',
    'default',
    BOOKEND_FADE_MS,
  ),

  // Placement — same arch position, same offsets → same camera path.
  ...establishingPullback('placement', STD_ARCH_Z),

  // Locomotion — anchored to the locomotion goal arch (z = -12.2) instead
  // of the standard proscenium. Same arch-relative deep + end offsets as
  // the other two, so the camera traces an identical path in arch-frame
  // space — just translated 9.7 m deeper into world Z to centre on the
  // locomotion arch. The arch lands at the same screen position with the
  // same framing as selection / placement.
  ...establishingPullback('locomotion', LOCOMOTION_ARCH_Z),

  // ───────── Manipulation: straight pull-back, then curve into the hero ─────────

  // Manipulation deep — snap to PATH_START. No fade declared so opacity
  // persists at 1 (black) from locomotion's fadeOut.
  {
    shot: 'manipulation-deep',
    lab: 'manipulation',
    ...PATH_START,
    tweenMs: 0,
    holdMs: DEEP_HOLD_MS,
  },

  // Stage A — straight pure-Z pull-back. Same rhythm as the other lab
  // pull-backs (the camera comes through the arch at uniform speed).
  // FadeIn from the locomotion blackout reveals the manipulation lab.
  {
    shot: 'manipulation-straight',
    lab: 'manipulation',
    ...STRAIGHT_END,
    tweenMs: STRAIGHT_MS,
    holdMs: 0,
    ease: 'linear',
    fadeInMs: SCENE_FADE_MS,
  },

  // Stage B begins. Two intermediate samples (t=0.25 then t=0.5) trace the
  // first half of the Bézier so the eye reads it as a curve, not a chord.
  // The first segment continues in nearly the same direction as Stage A
  // (curve tangent at t=0 = +Z), then bends.
  {
    shot: 'manipulation-curve-quarter',
    lab: 'manipulation',
    ...pathAt(T_QUARTER),
    tweenMs: CURVE_QUARTER_MS,
    holdMs: 0,
    ease: 'linear',
  },
  {
    shot: 'manipulation-curve-half',
    lab: 'manipulation',
    ...pathAt(T_HALF),
    tweenMs: CURVE_QUARTER_MS,
    holdMs: 0,
    ease: 'linear',
  },

  // Theme swaps to cloud-park at the curve's *midpoint* — the bright palette
  // takes over while the camera is still arcing toward the hero pose.
  {
    shot: 'manipulation-themed',
    lab: 'manipulation',
    themePresetId: 'cloud-park',
    ...pathAt(T_THEMED),
    tweenMs: LAB_SLICE_MS,
    holdMs: 0,
    ease: 'linear',
  },

  // Locomotion lab snap. Locomotion's arch sits at z = -12.2 vs z = -2.5 for
  // the others, so the camera world-pose offsets by LOCOMOTION_CAM_Z_OFFSET
  // to keep the proscenium anchored on screen. `fromPos*` snaps the tween
  // start into locomotion-arch space so the camera doesn't smear 9.7 m
  // across the discontinuity.
  {
    shot: 'finale-locomotion',
    lab: 'locomotion',
    ...pathAt(T_LOCOMOTION),
    posZ: pathAt(T_LOCOMOTION).posZ + LOCOMOTION_CAM_Z_OFFSET,
    fromPosX: pathAt(T_THEMED).posX,
    fromPosY: pathAt(T_THEMED).posY,
    fromPosZ: pathAt(T_THEMED).posZ + LOCOMOTION_CAM_Z_OFFSET,
    fromYawDeg: pathAt(T_THEMED).yawDeg,
    fromPitchDeg: pathAt(T_THEMED).pitchDeg,
    fromFov: pathAt(T_THEMED).fov,
    tweenMs: LAB_SLICE_MS,
    holdMs: 0,
    ease: 'linear',
  },

  // Placement lab snap. `fromPos*` returns to standard arch space at the
  // matching curve sample so the camera resumes the standard path.
  {
    shot: 'finale-placement',
    lab: 'placement',
    ...pathAt(T_PLACEMENT),
    fromPosX: pathAt(T_LOCOMOTION).posX,
    fromPosY: pathAt(T_LOCOMOTION).posY,
    fromPosZ: pathAt(T_LOCOMOTION).posZ,
    fromYawDeg: pathAt(T_LOCOMOTION).yawDeg,
    fromPitchDeg: pathAt(T_LOCOMOTION).pitchDeg,
    fromFov: pathAt(T_LOCOMOTION).fov,
    tweenMs: LAB_SLICE_MS,
    holdMs: 0,
    ease: 'linear',
  },

  // Selection lab snap. Camera lands at hero pose; the reel began on
  // selection so closing on it makes the loop read intentional.
  {
    shot: 'finale-selection',
    lab: 'selection',
    ...pathAt(T_HERO),
    tweenMs: LAB_SLICE_MS,
    holdMs: 0,
    ease: 'linear',
  },

  // Held hero pose — caption fades in via the overlay's CSS animation, then
  // the screen fades to black over the last `BOOKEND_FADE_MS` of the hold so
  // the reel ends on a clean blackout (the caption auto-suppresses once
  // fadeOpacity > 0.4, so it disappears with the scene).
  {
    shot: 'finale-hold',
    lab: 'selection',
    ...pathAt(T_HERO),
    tweenMs: 0,
    holdMs: FINALE_HOLD_MS,
    fadeOutMs: BOOKEND_FADE_MS,
    caption: 'github.com/kewanglab/webxr-playground',
  },
]
