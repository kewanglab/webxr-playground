import type { Keyframe } from './director'

/**
 * Concept A — "The Director's Chair" demo reel.
 *
 * Plays as a single hands-free take when loaded with `?director=concept-a`.
 * Shots cut between labs via store-driven lab switches (no page reload), so
 * the canvas stays mounted for the full duration of the recording.
 *
 * Total runtime: ~32 s. Tune by editing this array; Vite hot-reload picks up
 * changes without restarting an in-progress autoplay.
 */
export const conceptA: Keyframe[] = [
  {
    shot: 'title',
    lab: 'selection',
    view: 'hero',
    tweenMs: 0,
    holdMs: 3000,
    caption: 'WebXR Interaction Playground',
  },
  {
    shot: 'pull-back',
    lab: 'selection',
    view: 'wide',
    tweenMs: 2500,
    holdMs: 600,
    ease: 'easeInOutCubic',
    caption: 'One stage. Every interaction.',
  },
  {
    shot: 'orbit-side',
    lab: 'selection',
    view: 'side',
    tweenMs: 2200,
    holdMs: 500,
    ease: 'easeInOutCubic',
  },
  {
    /**
     * Cinematic top-down — perspective camera angled steeply rather than the
     * authored `overhead` view, which is orthographic + rotated and only
     * resolves correctly on `DesktopOrthographicCamera`. Director mode always
     * outputs a perspective camera, so we choreograph our own steep tilt.
     */
    shot: 'overhead',
    lab: 'selection',
    posX: 0,
    posY: 3.4,
    posZ: 0.2,
    yawDeg: 0,
    pitchDeg: -65,
    fov: 50,
    tweenMs: 0,
    holdMs: 2500,
    caption: 'Selection · ray · pinch · touch',
  },
  {
    shot: 'pov',
    lab: 'selection',
    view: 'headset',
    tweenMs: 0,
    holdMs: 3500,
    caption: "Designer's eyes — same stage, headset POV",
  },
  {
    shot: 'whip-locomotion',
    lab: 'locomotion',
    view: 'hero',
    tweenMs: 350,
    holdMs: 2800,
    ease: 'easeOutExpo',
    caption: 'Locomotion · teleport + smooth',
  },
  {
    shot: 'cut-placement',
    lab: 'placement',
    view: 'hero',
    tweenMs: 0,
    holdMs: 3000,
    caption: 'Placement · hit-test crystals',
  },
  {
    shot: 'truck-manipulation',
    lab: 'manipulation',
    view: 'side',
    tweenMs: 3000,
    holdMs: 800,
    ease: 'easeInOutCubic',
    caption: 'Manipulation · DOF-separated docking',
  },
  {
    shot: 'final-wide',
    lab: 'manipulation',
    posX: 0,
    posY: 2.0,
    posZ: 6.5,
    yawDeg: 20,
    pitchDeg: -6,
    fov: 40,
    tweenMs: 1500,
    holdMs: 2200,
    ease: 'easeInOutCubic',
  },
  {
    shot: 'cta',
    lab: 'manipulation',
    view: 'hero',
    tweenMs: 600,
    holdMs: 2500,
    ease: 'easeInOutCubic',
    caption: 'github.com/kewanglab/webxr-playground',
  },
]
