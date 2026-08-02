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
 * - **entry** — the entry chunk plus its stylesheet: what a Quest downloads
 *   before it can draw anything. Lazy room/kit chunks are excluded because
 *   they load on demand.
 * - **total** — everything published to Pages. This is the number the asset
 *   diet bought down (67 MB of kit textures to ~2 MB); nothing else stops it
 *   creeping back, since an oversized bundle builds perfectly green.
 *
 * Budgets are deliberate ceilings, not observations. Raising one is fine —
 * do it in a commit that says why, so the increase is a decision rather than
 * a drift nobody noticed.
 */
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = fileURLToPath(new URL('../dist/', import.meta.url))

/** Ceilings in KiB. Current usage sits ~20% under each. */
const BUDGETS = {
  entry: 1024, //  ~805 KiB at time of writing
  total: 12 * 1024, // ~9.8 MiB at time of writing
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

function kib(bytes) {
  return Math.round(bytes / KIB)
}

if (!existsSync(DIST)) {
  console.error('dist/ not found — run `npm run build` first.')
  process.exit(1)
}

const files = walk(DIST)
const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0)

// The entry chunk is whatever index.html actually references, so a rename or
// a chunking-strategy change can't silently make this check measure nothing.
const html = readFileSync(join(DIST, 'index.html'), 'utf8')
const refs = [
  ...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g),
].map((m) => m[1].replace(/^\//, ''))

if (refs.length === 0) {
  console.error('No entry script/stylesheet found in dist/index.html — check the regexes.')
  process.exit(1)
}

let entryBytes = 0
const missing = []
for (const ref of refs) {
  const full = join(DIST, ref)
  if (!existsSync(full)) missing.push(ref)
  else entryBytes += statSync(full).size
}

if (missing.length > 0) {
  console.error(`index.html references files not present in dist/: ${missing.join(', ')}`)
  process.exit(1)
}

console.log('Largest files in dist/:')
for (const f of files.sort((a, b) => b.bytes - a.bytes).slice(0, 10)) {
  console.log(`  ${String(kib(f.bytes)).padStart(6)} KiB  ${f.path.slice(DIST.length)}`)
}
console.log()

const checks = [
  { name: 'entry (initial load)', actual: entryBytes, budget: BUDGETS.entry },
  { name: 'total (deploy artifact)', actual: totalBytes, budget: BUDGETS.total },
]

let failed = false
for (const c of checks) {
  const actual = kib(c.actual)
  const pct = Math.round((c.actual / (c.budget * KIB)) * 100)
  const over = actual > c.budget
  if (over) failed = true
  console.log(
    `${over ? 'FAIL' : 'ok  '}  ${c.name.padEnd(24)} ${String(actual).padStart(6)} KiB / ${String(c.budget).padStart(6)} KiB budget (${pct}%)`,
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
