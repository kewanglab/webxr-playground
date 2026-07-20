import { describe, expect, test } from 'vitest'
import {
  getLabTitle,
  isValidLabId,
  labs,
  selectionTargetPositions,
  tuningPresets,
  type LabId,
} from '../../src/config/labs'
import {
  defaultPlaygroundPresetId,
  getPlaygroundPreset,
  isValidPresetId,
  playgroundPresets,
} from '../../src/config/playgroundTheme'
import { readLevaNumber } from '../../src/ui/levaPlugins/readLevaNumber'

describe('lab registry', () => {
  test('validates every registered lab id and rejects unknown ids', () => {
    for (const lab of labs) expect(isValidLabId(lab.id)).toBe(true)
    expect(isValidLabId('teleportation')).toBe(false)
    expect(isValidLabId('')).toBe(false)
  })

  test('getLabTitle resolves names and falls back to the raw id', () => {
    expect(getLabTitle('selection')).toBe('Selection Lab')
    expect(getLabTitle('ghost-lab' as LabId)).toBe('ghost-lab')
  })

  test('pinch and touch targets are symmetric at arm’s reach (design handoff §04)', () => {
    const [px, py, pz] = selectionTargetPositions.pinch
    const [tx, ty, tz] = selectionTargetPositions.touch
    expect(px).toBe(-tx)
    expect(py).toBe(ty)
    expect(pz).toBe(tz)
  })

  test('ray target sits farther away than the near-field targets', () => {
    const rayDist = Math.abs(selectionTargetPositions.ray[2])
    const pinchDist = Math.abs(selectionTargetPositions.pinch[2])
    expect(rayDist).toBeGreaterThan(pinchDist)
  })
})

describe('tuning presets', () => {
  test('docking snap tolerances are positive and tight (skill-based lock feel)', () => {
    const { snapToleranceM, snapToleranceDeg } = tuningPresets.manipulation.docking
    expect(snapToleranceM).toBeGreaterThan(0)
    expect(snapToleranceDeg).toBeGreaterThan(0)
    expect(snapToleranceM).toBeLessThanOrEqual(0.1)
    expect(snapToleranceDeg).toBeLessThanOrEqual(30)
  })

  test('sizes and gains that drive geometry are never zero (see pitfalls.md)', () => {
    expect(tuningPresets.controller.selection.targetSize).toBeGreaterThan(0)
    expect(tuningPresets.hand.selection.targetSize).toBeGreaterThan(0)
    expect(tuningPresets.controller.placement.objectSize).toBeGreaterThan(0)
    expect(tuningPresets.hand.placement.objectSize).toBeGreaterThan(0)
    expect(tuningPresets.manipulation.objectSize).toBeGreaterThan(0)
    expect(tuningPresets.manipulation.cdGain).toBeGreaterThan(0)
  })
})

describe('theme presets', () => {
  test('the default preset id is registered', () => {
    expect(isValidPresetId(defaultPlaygroundPresetId)).toBe(true)
  })

  test('unknown ids are rejected by the validator but resolved to the default preset', () => {
    expect(isValidPresetId('vaporwave')).toBe(false)
    expect(getPlaygroundPreset('vaporwave').id).toBe(defaultPlaygroundPresetId)
  })

  test('every preset resolves to itself', () => {
    for (const preset of playgroundPresets) {
      expect(getPlaygroundPreset(preset.id).id).toBe(preset.id)
    }
  })
})

describe('readLevaNumber', () => {
  test('passes finite numbers through', () => {
    expect(readLevaNumber(0.25, 1)).toBe(0.25)
    expect(readLevaNumber(0, 1)).toBe(0)
  })

  test('parses transient string values from Leva inputs', () => {
    expect(readLevaNumber('0.4', 1)).toBe(0.4)
    expect(readLevaNumber('-2', 1)).toBe(-2)
  })

  test('falls back on NaN, Infinity, and junk', () => {
    expect(readLevaNumber(Number.NaN, 7)).toBe(7)
    expect(readLevaNumber(Number.POSITIVE_INFINITY, 7)).toBe(7)
    expect(readLevaNumber('abc', 7)).toBe(7)
    expect(readLevaNumber('', 7)).toBe(7)
    expect(readLevaNumber(undefined, 7)).toBe(7)
    expect(readLevaNumber(null, 7)).toBe(7)
  })
})
