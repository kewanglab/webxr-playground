import type { SessionLogEntry } from '../app/store'

export type LogApiPayload = {
  ok: boolean
  path?: string
  count?: number
  error?: string
}

export async function postLogEntryToDesktop(entry: SessionLogEntry): Promise<LogApiPayload> {
  const response = await fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entry }),
  })
  const payload = (await response.json()) as LogApiPayload
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status}`)
  }
  return payload
}

export async function postLogEntriesToDesktop(entries: SessionLogEntry[]): Promise<LogApiPayload> {
  const response = await fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  })
  const payload = (await response.json()) as LogApiPayload
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error ?? `HTTP ${response.status}`)
  }
  return payload
}
