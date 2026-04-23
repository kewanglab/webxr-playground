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
            const store = await readStore()
            sendJson(res, 200, { ok: true, path: logsFile, ...store })
            return
          }

          if (req.method === 'POST') {
            const body = await readBody(req)
            const parsed = body ? (JSON.parse(body) as Partial<LogStore> & { entry?: SessionLogEntry }) : {}
            const store = await readStore()

            let nextEntries = store.entries
            if (parsed.entry) {
              nextEntries = [...store.entries, parsed.entry]
            } else if (Array.isArray(parsed.entries)) {
              nextEntries = parsed.entries
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
