import type { SessionLogEntry } from '../app/store'

export type LogApiPayload = {
  ok: boolean
  path?: string
  count?: number
  error?: string
}

/**
 * `/api/logs` is dev-server middleware (`desktopLogApiPlugin` in
 * `vite.config.ts`). A production build — GitHub Pages, `vite preview`, any
 * static host — has no such endpoint, so `BASE_URL` keeps the request inside
 * the deploy subpath and the calls below degrade instead of erroring.
 */
const LOG_API_PATH = `${import.meta.env.BASE_URL}api/logs`

/**
 * Raised when the desktop log API isn't there at all, as opposed to being
 * there and failing. Callers treat this as "local-only mode", not an error.
 */
export class DesktopSyncUnavailableError extends Error {
  constructor() {
    super('desktop sync unavailable')
    this.name = 'DesktopSyncUnavailableError'
  }
}

/**
 * `false` once we know there is no dev API to talk to. A production build knows
 * this up front, which is what keeps a hosted session from firing a doomed
 * request and printing a browser network error to the console; a dev session
 * starts optimistic and flips if the server goes away mid-session.
 */
let desktopSyncAvailable: boolean | null = import.meta.env.PROD ? false : null

/** True when logging is local-only — nothing will reach `logs/session-notes.json`. */
export function isDesktopSyncUnavailable(): boolean {
  return desktopSyncAvailable === false
}

async function postToLogApi(body: unknown): Promise<LogApiPayload> {
  if (desktopSyncAvailable === false) throw new DesktopSyncUnavailableError()

  let response: Response
  try {
    response = await fetch(LOG_API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // Nothing answering at all — dev server stopped, or offline.
    desktopSyncAvailable = false
    throw new DesktopSyncUnavailableError()
  }

  // A static host has no route here: 404 for a missing file, or 405 because a
  // POST to a static asset isn't allowed. Either means "no API", not "failed".
  if (response.status === 404 || response.status === 405) {
    desktopSyncAvailable = false
    throw new DesktopSyncUnavailableError()
  }

  let payload: LogApiPayload
  try {
    payload = (await response.json()) as LogApiPayload
  } catch {
    // Answered, but not with our JSON — an SPA fallback page, a proxy error
    // page. Same conclusion: this isn't the dev log API.
    desktopSyncAvailable = false
    throw new DesktopSyncUnavailableError()
  }

  if (!response.ok || !payload.ok) {
    // A real failure from a real API — surface it rather than hiding it.
    throw new Error(payload.error ?? `HTTP ${response.status}`)
  }

  desktopSyncAvailable = true
  return payload
}

export async function postLogEntryToDesktop(entry: SessionLogEntry): Promise<LogApiPayload> {
  return postToLogApi({ entry })
}

export async function postLogEntriesToDesktop(entries: SessionLogEntry[]): Promise<LogApiPayload> {
  return postToLogApi({ entries })
}
