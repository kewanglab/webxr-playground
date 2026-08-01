import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * DOM contract test for the `stepperNumber` Leva plugin (not a screenshot test —
 * it lives here because `playwright.config.ts` points `testDir` at ./tests/visual).
 *
 * The bug this guards: leva 0.10.1's `parseOptions` collapses a custom plugin's
 * input to `input.value` whenever a `value` key is present, stripping
 * `min`/`max`/`step` before `normalize` sees them. The plugin then fell back to
 * its 0–100 defaults and every stepper rendered the midpoint — 50. The fix hands
 * leva an `init`-keyed object instead, so the settings survive.
 *
 * Assertions read the rendered `input[type=range]` / `input[type=number]`
 * attributes, which are driven straight from the normalized `settings`, so a
 * regression in that path fails here rather than in a headset.
 */

type StepperSpec = {
  /** Leva control key, rendered verbatim as the row label. */
  name: string
  value: number
  min: number
  max: number
  step: number
}

const LAB_STEPPERS = {
  locomotion: [
    { name: 'moveSpeed', value: 1.8, min: 0.2, max: 4, step: 0.1 },
    { name: 'moveDeadzone', value: 0.2, min: 0.05, max: 0.5, step: 0.05 },
    { name: 'turnDeadzone', value: 0.5, min: 0.2, max: 0.95, step: 0.05 },
    { name: 'snapTurnAngleDeg', value: 45, min: 15, max: 90, step: 15 },
    { name: 'smoothTurnSpeedDeg', value: 90, min: 30, max: 220, step: 10 },
  ],
  placement: [
    { name: 'objectSize', value: 0.12, min: 0.05, max: 0.3, step: 0.01 },
    { name: 'previewOpacity', value: 0.4, min: 0, max: 1, step: 0.05 },
  ],
  selection: [
    { name: 'targetSize', value: 0.3, min: 0.1, max: 1, step: 0.05 },
    { name: 'confirmScaleBoost', value: 0.15, min: 0.05, max: 0.35, step: 0.01 },
  ],
} satisfies Record<string, StepperSpec[]>

type LabId = keyof typeof LAB_STEPPERS

/**
 * Labs mount inside a Suspense boundary behind lazily-loaded chunks, so the Leva
 * folder appears a beat after `load`. Wait on the stepper count rather than a
 * fixed timeout — it also pins that no *extra* range inputs appear (leva's own
 * number rows render as `input[type=text]`, so every range on the page is ours).
 */
async function openLab(page: Page, lab: LabId) {
  await page.goto(`/?lab=${lab}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('input[type=range]')).toHaveCount(
    LAB_STEPPERS[lab].length,
    { timeout: 30_000 },
  )
}

/**
 * The stepper's Row: label + the stepper bar (−, number field, +, slider).
 * Leva nests the label text a couple of levels below the Row, so climb to the
 * nearest ancestor that actually owns a slider rather than hardcoding a depth.
 */
function stepperRow(page: Page, name: string): Locator {
  return page
    .getByText(name, { exact: true })
    .locator('xpath=ancestor::div[.//input[@type="range"]][1]')
}

const rangeOf = (row: Locator) => row.locator('input[type=range]')
const numberOf = (row: Locator) => row.locator('input[type=number]')

async function numericValue(input: Locator): Promise<number> {
  return Number(await input.inputValue())
}

for (const lab of Object.keys(LAB_STEPPERS) as LabId[]) {
  const specs: StepperSpec[] = LAB_STEPPERS[lab]

  test.describe(`${lab} lab steppers`, () => {
    test(`renders every stepper with its configured range`, async ({ page }) => {
      await openLab(page, lab)

      for (const spec of specs) {
        const row = stepperRow(page, spec.name)
        await expect(row, `${spec.name} row should be unique`).toHaveCount(1)

        const range = rangeOf(row)
        await expect(range, `${spec.name} slider min`).toHaveAttribute(
          'min',
          String(spec.min),
        )
        await expect(range, `${spec.name} slider max`).toHaveAttribute(
          'max',
          String(spec.max),
        )
        await expect(range, `${spec.name} slider step`).toHaveAttribute(
          'step',
          String(spec.step),
        )
        expect(await numericValue(range), `${spec.name} slider value`).toBeCloseTo(
          spec.value,
          5,
        )

        // The number field is driven by the same settings object.
        const number = numberOf(row)
        await expect(number, `${spec.name} field min`).toHaveAttribute(
          'min',
          String(spec.min),
        )
        await expect(number, `${spec.name} field max`).toHaveAttribute(
          'max',
          String(spec.max),
        )
        await expect(number, `${spec.name} field step`).toHaveAttribute(
          'step',
          String(spec.step),
        )
        expect(await numericValue(number), `${spec.name} field value`).toBeCloseTo(
          spec.value,
          5,
        )
      }
    })

    test(`no stepper falls back to the 0-100 default range`, async ({ page }) => {
      await openLab(page, lab)

      // The original bug's exact signature: normalize() never saw min/max/step,
      // so every control rendered leva's 0–100 midpoint.
      const collapsed = await page.locator('input[type=range]').evaluateAll((els) =>
        els
          .map((el) => el as HTMLInputElement)
          .filter((el) => el.min === '0' && el.max === '100' && el.step === '1')
          .map((el) => el.value),
      )
      expect(collapsed, 'steppers stuck on leva 0–100 defaults').toEqual([])
    })

    test(`+ and - move by the configured step`, async ({ page }) => {
      await openLab(page, lab)

      for (const spec of specs) {
        const row = stepperRow(page, spec.name)
        const number = numberOf(row)
        const start = await numericValue(number)

        await row.getByRole('button', { name: 'Increase' }).click()
        await expect
          .poll(() => numericValue(number), {
            message: `${spec.name} should increase by ${spec.step}`,
          })
          .toBeCloseTo(Math.min(start + spec.step, spec.max), 5)

        await row.getByRole('button', { name: 'Decrease' }).click()
        await expect
          .poll(() => numericValue(number), {
            message: `${spec.name} should return to ${start}`,
          })
          .toBeCloseTo(start, 5)
      }
    })

    test(`clamps at the configured min and max`, async ({ page }) => {
      await openLab(page, lab)

      // Entering an out-of-range number exercises leva's `sanitize`, which reads
      // `settings.min`/`settings.max`. If those had been stripped, the value
      // would clamp to 0/100 instead.
      for (const spec of specs) {
        const row = stepperRow(page, spec.name)
        const number = numberOf(row)
        const range = rangeOf(row)

        await number.fill(String(spec.max + Math.abs(spec.max) * 10 + 1000))
        await expect
          .poll(() => numericValue(number), { message: `${spec.name} clamps to max` })
          .toBeCloseTo(spec.max, 5)
        expect(await numericValue(range), `${spec.name} slider tracks max`).toBeCloseTo(
          spec.max,
          5,
        )

        await number.fill(String(spec.min - Math.abs(spec.min) * 10 - 1000))
        await expect
          .poll(() => numericValue(number), { message: `${spec.name} clamps to min` })
          .toBeCloseTo(spec.min, 5)
        expect(await numericValue(range), `${spec.name} slider tracks min`).toBeCloseTo(
          spec.min,
          5,
        )
      }
    })
  })
}
