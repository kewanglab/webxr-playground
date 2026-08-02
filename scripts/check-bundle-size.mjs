#!/usr/bin/env node
/**
 * Bundle size budget for the deployed artifact.
 *
 * Run after `vite build`:
 *
 *     npm run build && node scripts/check-bundle-size.mjs
 *
 * Two numbers matter for this project and they fail for different reasons:
 *
 * - **initial** — everything `index.html` pulls before the app can draw: the
 *   entry chunk, its stylesheet, and any `modulepreload` chunks. The preloads
 *   are not optional extras; Vite emits the hint precisely because they are
 *   static imports of the entry, and the browser fetches them at high priority
 *   before execution. Lazy room/kit chunks are excluded — they load on demand.
 * - **total** — everything published to Pages. This is the number the asset
 *   diet bought down (67 MB of kit textures to ~2 MB); nothing else stops it
 *   creeping back, since an oversized bundle builds perfectly green.
 *
 * Budgets are deliberate ceilings, not observations. Raising one is fine —
 * do it in a commit that says why, so the increase is a decision rather than
 * a drift nobody noticed.
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../dist/', import.meta.url))

/** Ceilings in KiB. Current usage sits ~15-20% under each. */
const BUDGETS = {
  initial: 2048, // ~1722 KiB at time of writing
  total: 12 * 1024, // ~9.7 MiB at time of writing
}

const KIB = 1024

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(full))
    else if (entry.isFile()) out.push({ path: full, bytes: statSync(full).size })
  }
  return out
}

const kib = (bytes) => Math.round(bytes / KIB)

if (!existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.')
  process.exit(1)
}

const files = walk(DIST)
const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0)

// Read what index.html actually references, so a rename or a change of
// chunking strategy cannot quietly turn this into a check that measures
// nothing. All three tag shapes count toward first paint.
const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const refs = [
  ...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+\.css)"/g),
].map((m) => m[1])

if (refs.length === 0) {
  console.error('No entry script/stylesheet found in dist/index.html — check the regexes.')
  process.exit(1)
}

/**
 * `vite build --base=/webxr-playground/` (what the Pages deploy uses) prefixes
 * every ref with the base path, which is not a directory inside dist/. Try the
 * literal path first, then fall back to locating the emitted file by name.
 */
function resolveRef(ref) {
  const direct = join(DIST, ref.replace(/^\//, ''))
  if (existsSync(direct)) return direct
  const name = basename(ref)
  return files.find((f) => basename(f.path) === name)?.path ?? null
}

let initialBytes = 0
const missing = []
for (const ref of refs) {
  const resolved = resolveRef(ref)
  if (resolved == null) missing.push(ref)
  else initialBytes += statSync(resolved).size
}

if (missing.length > 0) {
  console.error(`index.html references files not present in dist/: ${missing.join(', ')}`)
  process.exit(1)
}

console.log('Initial payload (index.html + preloads):')
for (const ref of refs) {
  const resolved = resolveRef(ref)
  console.log(`  ${String(kib(statSync(resolved).size)).padStart(6)} KiB  ${basename(ref)}`)
}
console.log('\nLargest files in dist/:')
for (const f of files.sort((a, b) => b.bytes - a.bytes).slice(0, 8)) {
  console.log(`  ${String(kib(f.bytes)).padStart(6)} KiB  ${f.path.slice(DIST.length)}`)
}
console.log()

const checks = [
  { name: 'initial (before first paint)', actual: initialBytes, budget: BUDGETS.initial },
  { name: 'total (deploy artifact)', actual: totalBytes, budget: BUDGETS.total },
]

let failed = false
for (const c of checks) {
  // Compare bytes, not rounded KiB — otherwise up to 511 bytes over the
  // ceiling rounds down and passes.
  const over = c.actual > c.budget * KIB
  if (over) failed = true
  const pct = Math.round((c.actual / (c.budget * KIB)) * 100)
  console.log(
    `${over ? 'FAIL' : 'ok  '}  ${c.name.padEnd(28)} ${String(kib(c.actual)).padStart(6)} KiB / ${String(c.budget).padStart(6)} KiB budget (${pct}%)`,
  )
}

if (failed) {
  console.error(
    '\nBundle size budget exceeded. Either trim the bundle, or raise the ceiling in\n' +
      'scripts/check-bundle-size.mjs with a commit message explaining the increase.',
  )
  process.exit(1)
}

console.log('\nWithin budget.')
