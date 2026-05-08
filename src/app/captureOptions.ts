export type CaptureMode = 'ui' | 'scene'

/**
 * `headset` is the first-person POV that matches what a Meta Quest 3 user sees
 * when standing at the XR origin and looking forward. It's the default view so
 * the desktop preview reads as a faithful preview of the in-headset experience.
 * `hero` / `side` / `overhead` / `wide` are authored review framings used by the
 * visual capture tests.
 */
export const captureViewIds = ['headset', 'hero', 'side', 'overhead', 'wide'] as const
export type CaptureViewId = (typeof captureViewIds)[number]

function searchParams(): URLSearchParams | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search)
}

export function readCaptureMode(): CaptureMode | null {
  const mode = searchParams()?.get('capture')
  if (mode === 'ui' || mode === 'scene') return mode
  return null
}

export function readCaptureViewId(): CaptureViewId {
  const view = searchParams()?.get('captureView')
  return captureViewIds.includes(view as CaptureViewId)
    ? (view as CaptureViewId)
    : 'headset'
}

/**
 * When `?director=<id>` is set, the playground enters Director mode: the shell
 * chrome is hidden, a scripted keyframe sequence drives the desktop camera and
 * the active lab, and a caption lower-third renders over the canvas. The id
 * names a preset registered in `src/cinematics/presets.ts`.
 *
 * Returns `null` when the preset id is missing or unknown — callers should
 * treat that as "director mode off".
 */
export function readDirectorPresetId(): string | null {
  const id = searchParams()?.get('director')
  return id ? id : null
}

/**
 * Optional `?seek=<index>` debug param that snaps the director timeline to a
 * specific keyframe at mount instead of starting from 0. Useful for previewing
 * a single shot (e.g. `?director=concept-a&seek=7`) and for headless visual
 * regression captures of individual keyframes.
 */
export function readDirectorSeek(): number | null {
  const raw = searchParams()?.get('seek')
  if (raw == null) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** When `?pause=1`, the director freezes time at the seek target — handy for verification. */
export function readDirectorPaused(): boolean {
  return searchParams()?.get('pause') === '1'
}
