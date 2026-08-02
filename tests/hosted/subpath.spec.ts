import { expect, test, type Page, type Request, type Response } from '@playwright/test'

/**
 * Guards the two things the Pages deploy actually depends on, neither of which
 * any other spec covers:
 *
 * 1. A `--base=/webxr-playground/` build resolves every asset. The kit GLB
 *    prefix and the self-hosted font path were both root-absolute once and
 *    404'd under the subpath — no in-scene text, no props, and a build that
 *    looked perfectly green.
 * 2. The session logger reports local-only instead of erroring when `/api/logs`
 *    isn't there, which is every hosted visitor.
 *
 * Runs against `vite preview` of a real subpath build — see
 * `playwright.hosted.config.ts`. `npm run test:hosted`.
 */

const LABS = ['selection', 'placement', 'locomotion', 'manipulation'] as const

type Failure = { url: string; detail: string }

/** Collects anything that would show up as a red line in a visitor's console. */
function watchForFailures(page: Page): Failure[] {
  const failures: Failure[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') {
      failures.push({ url: message.location().url, detail: message.text() })
    }
  })
  page.on('pageerror', (error) => {
    failures.push({ url: page.url(), detail: String(error) })
  })
  page.on('requestfailed', (request: Request) => {
    failures.push({ url: request.url(), detail: request.failure()?.errorText ?? 'request failed' })
  })
  page.on('response', (response: Response) => {
    if (response.status() >= 400) {
      failures.push({ url: response.url(), detail: `HTTP ${response.status()}` })
    }
  })
  return failures
}

async function openLab(page: Page, query: string) {
  await page.goto(query, { waitUntil: 'domcontentloaded' })
  await page.locator('#root canvas').waitFor({ state: 'visible' })
  // Kit-free scenes still resolve the font asynchronously; give the loaders a
  // beat so a late 404 lands inside the assertion window rather than after it.
  await page.waitForTimeout(2500)
}

for (const lab of LABS) {
  test(`${lab} lab loads under the deploy base with no failed requests`, async ({ page }) => {
    const failures = watchForFailures(page)
    await openLab(page, `?lab=${lab}`)
    expect(failures, `unexpected console errors / failed requests`).toEqual([])
  })
}

test('every asset index.html references is prefixed with the deploy base', async ({ page }) => {
  await page.goto('?lab=selection', { waitUntil: 'domcontentloaded' })
  const refs = await page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLScriptElement>('script[src]'),
      ...document.querySelectorAll<HTMLLinkElement>('link[href]'),
    ].map((el) => el.getAttribute('src') ?? el.getAttribute('href') ?? ''),
  )

  expect(refs.length).toBeGreaterThan(0)
  for (const ref of refs) {
    // Anything root-absolute that isn't under the base would 404 on Pages.
    if (ref.startsWith('/')) expect(ref).toMatch(/^\/webxr-playground\//)
  }
})

test('theme deep link survives the base path', async ({ page }) => {
  const shellBg = () =>
    page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--pg-shell-bg-canvas').trim(),
    )

  await openLab(page, '?lab=locomotion&theme=cloud-park')
  const cloudPark = await shellBg()

  await openLab(page, '?lab=locomotion&theme=default')
  const warmNight = await shellBg()

  // Both resolved, and to different palettes — an unknown `theme` value falls
  // back to the default, so equal values would mean the param did nothing.
  expect(cloudPark).not.toBe('')
  expect(cloudPark).not.toBe(warmNight)
})

test('session logger degrades to local-only without /api/logs', async ({ page }) => {
  const failures = watchForFailures(page)
  await openLab(page, '?lab=selection')

  // DOM-level clicks: the R3F canvas overlays the shell chrome for Playwright's
  // hit-testing, which is a capture-rig artefact rather than a real defect.
  const click = (name: RegExp) =>
    page
      .getByRole('button', { name })
      .first()
      .evaluate((el) => (el as HTMLButtonElement).click())

  await click(/Expand session logger panel/i)
  await page.getByRole('textbox', { name: /Quick note/i }).fill('subpath spec note')
  await click(/^Log$/)

  const panel = page.locator('#session-logger-panel')
  await expect(panel).toContainText('local only — desktop sync unavailable')
  await expect(panel).not.toContainText('sync failed')

  await click(/Session notes/i)
  await expect(panel).toContainText('Clear local log')
  await expect(panel).not.toContainText('Sync to Desktop')

  // The whole point of the fallback: it survives a reload with no server.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('#root canvas').waitFor({ state: 'visible' })
  await click(/Expand session logger panel/i)
  await click(/Session notes/i)
  const restored = await page
    .locator('#session-logger-panel textarea')
    .evaluateAll((els) => els.map((el) => (el as HTMLTextAreaElement).value))
  expect(restored).toContain('subpath spec note')

  expect(failures, 'unexpected console errors / failed requests').toEqual([])
})
