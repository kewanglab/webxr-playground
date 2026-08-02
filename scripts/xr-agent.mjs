#!/usr/bin/env node
/**
 * Command-line driver for the agent harness.
 *
 * `npm run dev:agent` starts a Vite dev server with `@iwsdk/vite-plugin-dev`,
 * which opens a headless Playwright browser and exposes a WebSocket relay at
 * `/__iwer_mcp`. That relay is what the plugin's MCP server talks to; this
 * script talks the same protocol directly, so the harness can be driven from
 * a shell (or by an agent with only a Bash tool) without first registering an
 * MCP server in an editor's config.
 *
 * Wire protocol: `{ id, method, params }` in, `{ id, result | error }` back.
 * `method` is the MCP tool name minus its group prefix for device/browser
 * tools (`xr_set_transform` → `set_transform`), and the tool name verbatim
 * for the ECS-shaped ones this repo answers itself (`ecs_step`). Methods land
 * either in the plugin (screenshots, console) or, via
 * `window.FRAMEWORK_MCP_RUNTIME`, in `src/dev/agentHarness.tsx`.
 *
 * Usage:
 *   node scripts/xr-agent.mjs <method> [json-params]
 *   node scripts/xr-agent.mjs --script <file.json>    # array of [method, params]
 *   node scripts/xr-agent.mjs screenshot --out shot.png
 *
 * Examples:
 *   node scripts/xr-agent.mjs get_session_status
 *   node scripts/xr-agent.mjs set_transform '{"device":"hand-right","position":{"x":0,"y":1.2,"z":-0.7}}'
 *   node scripts/xr-agent.mjs ecs_find_entities '{"namePattern":"ExtrudeGeometry"}'
 */
import { writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const PORT = process.env.XR_AGENT_PORT ?? '5173'
const URL = `ws://127.0.0.1:${PORT}/__iwer_mcp`
const TIMEOUT_MS = Number(process.env.XR_AGENT_TIMEOUT ?? 30000)

/** Methods the plugin answers server-side; everything else is relayed to the page. */
export function connect(url = URL) {
  const ws = new WebSocket(url)
  const pending = new Map()
  let seq = 0

  const ready = new Promise((resolve, reject) => {
    ws.addEventListener('open', () => resolve())
    ws.addEventListener('error', () => reject(new Error(`Cannot reach ${url} — is \`npm run dev:agent\` running?`)))
  })

  ws.addEventListener('message', (event) => {
    let message
    try {
      message = JSON.parse(event.data)
    } catch {
      return
    }
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    clearTimeout(entry.timer)
    if (message.error) {
      const error = new Error(message.error.message ?? 'unknown error')
      error.code = message.error.code
      entry.reject(error)
    } else {
      entry.resolve(message.result)
    }
  })

  async function call(method, params = {}) {
    await ready
    const id = `xr-agent-${process.pid}-${++seq}`
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`Timed out after ${TIMEOUT_MS}ms waiting for "${method}"`))
      }, TIMEOUT_MS)
      pending.set(id, { resolve, reject, timer })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  return { call, close: () => ws.close(), ready }
}

/** Screenshots come back base64; write them out rather than printing them. */
function handleResult(method, result, outPath) {
  if (result && typeof result === 'object' && typeof result.imageData === 'string') {
    const target = outPath ?? `${method}.png`
    const bytes = Buffer.from(result.imageData, 'base64')
    writeFileSync(target, bytes)
    return { wrote: target, bytes: bytes.length, mimeType: result.mimeType }
  }
  return result
}

async function main(argv) {
  const outIndex = argv.indexOf('--out')
  let outPath
  if (outIndex !== -1) {
    outPath = argv[outIndex + 1]
    argv.splice(outIndex, 2)
  }

  let steps
  const scriptIndex = argv.indexOf('--script')
  if (scriptIndex !== -1) {
    const file = argv[scriptIndex + 1]
    if (!file) throw new Error('--script needs a file path')
    steps = JSON.parse(await readFile(file, 'utf8'))
  } else {
    const [method, rawParams] = argv
    if (!method) throw new Error('Usage: node scripts/xr-agent.mjs <method> [json-params]')
    steps = [[method, rawParams ? JSON.parse(rawParams) : {}]]
  }

  const client = connect()
  try {
    for (const step of steps) {
      const [method, params = {}, options = {}] = Array.isArray(step)
        ? step
        : [step.method, step.params, step]
      if (options.delayMs) await new Promise((r) => setTimeout(r, options.delayMs))
      const result = await client.call(method, params)
      const shown = handleResult(method, result, options.out ?? outPath)
      console.log(`${method} → ${JSON.stringify(shown)}`)
    }
  } finally {
    client.close()
  }
}

// Only run the CLI when invoked directly, so the module can also be imported.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(String(error.message ?? error))
    process.exit(1)
  })
}
