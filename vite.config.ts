import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

type SessionLogEntry = {
  id?: string
  timestamp: string
  labId: string
  mode: 'immersive-vr' | 'immersive-ar' | 'inline' | null
  inputSource: 'controller' | 'hand' | 'mixed'
  note: string
  fromHeadset?: boolean
}

type LogStore = {
  updatedAt: string
  entries: SessionLogEntry[]
}

// Hard limits on the dev log endpoint. Each entry is short text; 256 KB
// / 5 000 entries is well above realistic session use but bounded enough to
// prevent the endpoint from being abused as a memory / disk-fill vector.
const MAX_BODY_BYTES = 256 * 1024
const MAX_ENTRIES = 5_000
const MAX_NOTE_LENGTH = 8_000
const MAX_STRING_LENGTH = 256

const ALLOWED_MODES = new Set(['immersive-vr', 'immersive-ar', 'inline'])
const ALLOWED_INPUT_SOURCES = new Set(['controller', 'hand', 'mixed'])

// Strip ASCII control characters (preserve tab/newline/CR) so a malicious
// client can't smuggle terminal escapes or NUL bytes into the on-disk JSON.
// Built via RegExp so this source file never embeds literal control bytes.
const CONTROL_CHAR_RE = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]',
  'g',
)

function isLoopbackHost(host: string | undefined): boolean {
  if (!host) return false
  // Strip optional port; handle bracketed IPv6 hosts like [::1]:5173.
  const hostname = host.startsWith('[')
    ? host.slice(1, host.indexOf(']'))
    : host.replace(/:\d+$/, '')
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  )
}

function isAllowedOrigin(origin: string | undefined, host: string | undefined): boolean {
  // Non-browser clients (curl, the headset's WebView when using adb reverse, etc.)
  // omit Origin — allow those, but only paired with a loopback Host (verified
  // separately). Browsers always set Origin on cross-origin fetch, so a mismatch
  // is a CSRF / DNS-rebinding signal.
  if (!origin) return true
  try {
    const url = new URL(origin)
    if (url.host === host) return true
    return isLoopbackHost(url.host)
  } catch {
    return false
  }
}

function sanitizeString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  if (value.length > maxLength) return null
  return value.replace(CONTROL_CHAR_RE, '')
}

function sanitizeEntry(value: unknown): SessionLogEntry | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>

  const timestamp = sanitizeString(raw.timestamp, MAX_STRING_LENGTH)
  const labId = sanitizeString(raw.labId, MAX_STRING_LENGTH)
  const note = sanitizeString(raw.note, MAX_NOTE_LENGTH)
  if (timestamp == null || labId == null || note == null) return null
  // Reject timestamps that aren't parseable dates so the viewer's
  // `new Date(...).toLocaleString()` always renders a real date string.
  if (Number.isNaN(Date.parse(timestamp))) return null

  let mode: SessionLogEntry['mode']
  if (raw.mode === null || raw.mode === undefined) {
    mode = null
  } else {
    const m = sanitizeString(raw.mode, MAX_STRING_LENGTH)
    if (m == null || !ALLOWED_MODES.has(m)) return null
    mode = m as SessionLogEntry['mode']
  }

  const inputSource = sanitizeString(raw.inputSource, MAX_STRING_LENGTH)
  if (inputSource == null || !ALLOWED_INPUT_SOURCES.has(inputSource)) return null

  const entry: SessionLogEntry = {
    timestamp,
    labId,
    mode,
    inputSource: inputSource as SessionLogEntry['inputSource'],
    note,
  }

  if (typeof raw.id === 'string') {
    const id = sanitizeString(raw.id, MAX_STRING_LENGTH)
    if (id != null) entry.id = id
  }
  if (typeof raw.fromHeadset === 'boolean') {
    entry.fromHeadset = raw.fromHeadset
  }

  return entry
}

function desktopLogApiPlugin(): Plugin {
  const logsDir = resolve(process.cwd(), 'logs')
  const logsFile = resolve(logsDir, 'session-notes.json')

  async function readStore(): Promise<LogStore> {
    try {
      const raw = await readFile(logsFile, 'utf8')
      const parsed = JSON.parse(raw) as LogStore
      return {
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      }
    } catch {
      return {
        updatedAt: new Date().toISOString(),
        entries: [],
      }
    }
  }

  async function writeStore(store: LogStore) {
    await mkdir(logsDir, { recursive: true })
    await writeFile(logsFile, JSON.stringify(store, null, 2), 'utf8')
  }

  async function readBody(req: import('node:http').IncomingMessage): Promise<string | null> {
    const chunks: Uint8Array[] = []
    let total = 0
    for await (const chunk of req) {
      const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
      total += buf.length
      if (total > MAX_BODY_BYTES) return null
      chunks.push(buf)
    }
    return Buffer.concat(chunks).toString('utf8')
  }

  function sendJson(
    res: import('node:http').ServerResponse,
    statusCode: number,
    payload: unknown,
  ) {
    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(payload))
  }

  return {
    name: 'desktop-log-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url !== '/api/logs') {
          next()
          return
        }

        // The log file lives on the developer's disk, so the endpoint must
        // refuse any caller that isn't the playground served from this same
        // dev server. We restrict to loopback Host headers (blocks DNS
        // rebinding + LAN attackers when Vite binds to 0.0.0.0) and require
        // the Origin header — if present — to match the server's origin.
        const host = req.headers.host
        if (!isLoopbackHost(host)) {
          sendJson(res, 403, { ok: false, error: 'Forbidden host' })
          return
        }
        const origin = req.headers.origin
        if (!isAllowedOrigin(origin, host)) {
          sendJson(res, 403, { ok: false, error: 'Forbidden origin' })
          return
        }

        try {
          if (req.method === 'GET') {
            const store = await readStore()
            sendJson(res, 200, { ok: true, path: logsFile, ...store })
            return
          }

          if (req.method === 'POST') {
            // Reject content types other than JSON so a stray HTML form post
            // (the only cross-origin POST a browser sends without a preflight)
            // can't reach the parser even if Origin checks slip.
            const contentType = req.headers['content-type'] ?? ''
            if (!contentType.toLowerCase().includes('application/json')) {
              sendJson(res, 415, { ok: false, error: 'Unsupported content type' })
              return
            }

            const body = await readBody(req)
            if (body === null) {
              sendJson(res, 413, { ok: false, error: 'Request body too large' })
              return
            }

            let parsed: Partial<LogStore> & { entry?: unknown }
            try {
              parsed = body ? JSON.parse(body) : {}
            } catch {
              sendJson(res, 400, { ok: false, error: 'Invalid JSON' })
              return
            }
            if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
              sendJson(res, 400, { ok: false, error: 'Invalid payload' })
              return
            }

            const store = await readStore()

            let nextEntries = store.entries
            if (parsed.entry !== undefined) {
              const sanitized = sanitizeEntry(parsed.entry)
              if (!sanitized) {
                sendJson(res, 400, { ok: false, error: 'Invalid entry' })
                return
              }
              nextEntries = [...store.entries, sanitized]
            } else if (Array.isArray(parsed.entries)) {
              if (parsed.entries.length > MAX_ENTRIES) {
                sendJson(res, 413, { ok: false, error: 'Too many entries' })
                return
              }
              const sanitized: SessionLogEntry[] = []
              for (const item of parsed.entries) {
                const entry = sanitizeEntry(item)
                if (!entry) {
                  sendJson(res, 400, { ok: false, error: 'Invalid entry' })
                  return
                }
                sanitized.push(entry)
              }
              nextEntries = sanitized
            }

            if (nextEntries.length > MAX_ENTRIES) {
              sendJson(res, 413, { ok: false, error: 'Too many entries' })
              return
            }

            const nextStore: LogStore = {
              updatedAt: new Date().toISOString(),
              entries: nextEntries,
            }
            await writeStore(nextStore)
            sendJson(res, 200, {
              ok: true,
              path: logsFile,
              updatedAt: nextStore.updatedAt,
              count: nextStore.entries.length,
            })
            return
          }

          if (req.method === 'DELETE') {
            const nextStore: LogStore = {
              updatedAt: new Date().toISOString(),
              entries: [],
            }
            await writeStore(nextStore)
            sendJson(res, 200, { ok: true, path: logsFile, updatedAt: nextStore.updatedAt, count: 0 })
            return
          }

          sendJson(res, 405, { ok: false, error: 'Method not allowed' })
        } catch (error) {
          sendJson(res, 500, {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown server error',
          })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), desktopLogApiPlugin()],
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
})
