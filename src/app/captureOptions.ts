export type CaptureMode = 'ui' | 'scene'

export const captureViewIds = ['hero', 'side', 'overhead', 'wide'] as const
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
    : 'hero'
}
