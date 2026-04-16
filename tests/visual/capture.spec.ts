import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const outputRoot = fileURLToPath(
  new URL('../../docs/mockups/captures/', import.meta.url),
)

const themes = ['default', 'cloud-park'] as const
const labs = ['selection', 'placement', 'locomotion', 'manipulation'] as const
const sceneViews = ['hero', 'side', 'overhead', 'wide'] as const
const selectionAngleViews = ['side', 'overhead', 'wide'] as const

type OpenCaptureOptions = {
  theme: (typeof themes)[number]
  lab: (typeof labs)[number]
  capture: 'ui' | 'scene'
  captureView?: (typeof sceneViews)[number]
}

async function openCapture(page: Page, options: OpenCaptureOptions) {
  const params = new URLSearchParams({
    theme: options.theme,
    lab: options.lab,
    capture: options.capture,
  })

  if (options.captureView) params.set('captureView', options.captureView)

  await page.goto(`/?${params.toString()}`, { waitUntil: 'domcontentloaded' })
  await page.locator('canvas').waitFor({ state: 'visible' })
  await page.waitForFunction(() => {
    const canvas = document.querySelector('canvas')
    return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0
  })

  // Give R3F one short breath after async model/material work before taking the frame.
  await page.waitForTimeout(850)
}

function screenshotPath(...parts: string[]) {
  const path = [outputRoot, ...parts].join('/')
  mkdirSync(dirname(path), { recursive: true })
  return path
}

async function expectCanvasHasSignal(page: Page) {
  const stats = await page.locator('canvas').evaluate((canvas) => {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return { averageLuminance: 0, nonZeroCoverage: 0 }

    const sampleWidth = Math.min(48, gl.drawingBufferWidth)
    const sampleHeight = Math.min(48, gl.drawingBufferHeight)
    const x = Math.max(0, Math.floor((gl.drawingBufferWidth - sampleWidth) / 2))
    const y = Math.max(0, Math.floor((gl.drawingBufferHeight - sampleHeight) / 2))
    const data = new Uint8Array(sampleWidth * sampleHeight * 4)

    gl.readPixels(x, y, sampleWidth, sampleHeight, gl.RGBA, gl.UNSIGNED_BYTE, data)

    let totalLum = 0
    let nonZero = 0

    for (let i = 0; i < data.length; i += 4) {
      const lum = data[i] * 0.2126 + data[i + 1] * 0.7152 + data[i + 2] * 0.0722
      totalLum += lum
      if (lum > 1) nonZero += 1
    }

    return {
      averageLuminance: totalLum / (sampleWidth * sampleHeight),
      nonZeroCoverage: nonZero / (sampleWidth * sampleHeight),
    }
  })

  expect(stats.averageLuminance).toBeGreaterThan(8)
  expect(stats.nonZeroCoverage).toBeGreaterThan(0.95)
}

test.describe('design capture screenshots', () => {
  for (const theme of themes) {
    test(`captures ${theme} desktop shell`, async ({ page }) => {
      await openCapture(page, { theme, lab: 'selection', capture: 'ui' })
      await expect(page.getByRole('heading', { name: 'WebXR Playground' })).toBeVisible()
      await page.screenshot({
        path: screenshotPath('ui', `${theme}-selection-shell.png`),
        fullPage: false,
      })
    })
  }

  for (const lab of labs) {
    test(`captures cloud-park ${lab} hero scene`, async ({ page }) => {
      await openCapture(page, {
        theme: 'cloud-park',
        lab,
        capture: 'scene',
        captureView: 'hero',
      })
      await expectCanvasHasSignal(page)
      await page.screenshot({
        path: screenshotPath('scenes', 'cloud-park', `${lab}-hero.png`),
        fullPage: false,
      })
    })
  }

  for (const view of selectionAngleViews) {
    test(`captures cloud-park selection ${view} angle`, async ({ page }) => {
      await openCapture(page, {
        theme: 'cloud-park',
        lab: 'selection',
        capture: 'scene',
        captureView: view,
      })
      await expectCanvasHasSignal(page)
      await page.screenshot({
        path: screenshotPath('scenes', 'cloud-park', `selection-${view}.png`),
        fullPage: false,
      })
    })
  }
})
