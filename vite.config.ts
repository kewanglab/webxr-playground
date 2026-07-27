import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

type SessionLogEntry = {
  id?: string
  timestamp: string
  labId: string
  mode: 'immersive-vr' | 'immersive-ar' | 'inline' | null
  inputSource: 'controller' | 'hand' | 'mixed'
  note: string
  fromHeadset?: boolean
  /** Structured payload mirrored from the app's SessionLogEntry (trial results etc.). */
  data?: Record<string, unknown>
}

type LogStore = {
  updatedAt: string
  entries: SessionLogEntry[]
}

function desktopLogApiPlugin(): Plugin {
  const logsDir = resolve(process.cwd(), 'logs')
  const logsFile = resolve(logsDir, 'session-notes.json')

  function emptyStore(): LogStore {
    return { updatedAt: new Date().toISOString(), entries: [] }
  }

  async function readStore(): Promise<LogStore> {
    let raw: string
    try {
      raw = await readFile(logsFile, 'utf8')
    } catch {
      // No file yet — a genuinely empty store.
      return emptyStore()
    }

    try {
      const parsed = JSON.parse(raw) as LogStore
      return {
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      }
    } catch (error) {
      // A corrupt file previously read back as "no entries", which is
      // indistinguishable from a session that logged nothing — that silence
      // cost a full headset test cycle. Preserve the bad file and say so.
      const quarantine = `${logsFile}.corrupt-${Date.now()}`
      try {
        await rename(logsFile, quarantine)
      } catch {
        // Best effort — still surface the parse failure below.
      }
      console.error(
        `[desktop-log-api] ${logsFile} was not valid JSON (${
          error instanceof Error ? error.message : 'parse error'
        }). Moved to ${quarantine} and starting a fresh store.`,
      )
      return emptyStore()
    }
  }

  /**
   * Atomic write: serialize into a sibling temp file, then rename over the
   * target. `rename` is atomic within a filesystem, so a reader never observes
   * a partially-written file, and a short write can't leave trailing bytes from
   * a previous longer one.
   */
  async function writeStore(store: LogStore) {
    await mkdir(logsDir, { recursive: true })
    const tmpFile = `${logsFile}.${process.pid}.${Date.now()}.tmp`
    await writeFile(tmpFile, JSON.stringify(store, null, 2), 'utf8')
    await rename(tmpFile, logsFile)
  }

  /**
   * Serializes read-modify-write cycles. Concurrent posters (e.g. two in-scene
   * loggers on the same frame budget) would otherwise interleave read and write
   * halves and lose or corrupt entries.
   */
  let queue: Promise<unknown> = Promise.resolve()
  function withStoreLock<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(task, task)
    // Keep the chain alive regardless of this task's outcome.
    queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  async function readBody(req: import('node:http').IncomingMessage): Promise<string> {
    const chunks: Uint8Array[] = []
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
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

        try {
          if (req.method === 'GET') {
            const store = await withStoreLock(readStore)
            sendJson(res, 200, { ok: true, path: logsFile, ...store })
            return
          }

          if (req.method === 'POST') {
            // Body is read outside the lock; only the read-modify-write is serialized.
            const body = await readBody(req)
            const parsed = body ? (JSON.parse(body) as Partial<LogStore> & { entry?: SessionLogEntry }) : {}

            const nextStore = await withStoreLock(async () => {
              const store = await readStore()

              let nextEntries = store.entries
              if (parsed.entry) {
                nextEntries = [...store.entries, parsed.entry]
              } else if (Array.isArray(parsed.entries)) {
                nextEntries = parsed.entries
              }

              const next: LogStore = {
                updatedAt: new Date().toISOString(),
                entries: nextEntries,
              }
              await writeStore(next)
              return next
            })

            sendJson(res, 200, {
              ok: true,
              path: logsFile,
              updatedAt: nextStore.updatedAt,
              count: nextStore.entries.length,
            })
            return
          }

          if (req.method === 'DELETE') {
            const nextStore = await withStoreLock(async () => {
              const next: LogStore = {
                updatedAt: new Date().toISOString(),
                entries: [],
              }
              await writeStore(next)
              return next
            })
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
