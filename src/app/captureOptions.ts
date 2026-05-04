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
