import { describe, expect, test } from 'vitest'
import {
  deriveYawPitchDeg,
  easings,
  lerp,
  lerpYawDeg,
  type Easing,
} from '../../src/cinematics/director'

const normalizeDeg = (deg: number) => ((deg % 360) + 360) % 360

describe('lerp', () => {
  test('interpolates linearly and hits both endpoints', () => {
    expect(lerp(10, 20, 0)).toBe(10)
    expect(lerp(10, 20, 1)).toBe(20)
    expect(lerp(10, 20, 0.25)).toBe(12.5)
  })
})

describe('lerpYawDeg', () => {
  test('takes the shortest arc across the 360° wrap', () => {
    // 350° → 10° should pass through 0°/360°, not swing back through 180°.
    expect(normalizeDeg(lerpYawDeg(350, 10, 0.5))).toBe(0)
    expect(normalizeDeg(lerpYawDeg(350, 10, 1))).toBe(10)

    expect(normalizeDeg(lerpYawDeg(10, 350, 0.5))).toBe(0)
    expect(normalizeDeg(lerpYawDeg(10, 350, 1))).toBe(350)
  })

  test('behaves like plain lerp when no wrap is involved', () => {
    expect(lerpYawDeg(30, 90, 0.5)).toBe(60)
  })
})

describe('easings', () => {
  test('every easing starts at 0 and ends at 1', () => {
    for (const name of Object.keys(easings) as Easing[]) {
      expect(easings[name](0), `${name}(0)`).toBeCloseTo(0, 6)
      expect(easings[name](1), `${name}(1)`).toBe(1)
    }
  })

  test('midpoints stay inside the unit interval', () => {
    for (const name of Object.keys(easings) as Easing[]) {
      const mid = easings[name](0.5)
      expect(mid, `${name}(0.5)`).toBeGreaterThan(0)
      expect(mid, `${name}(0.5)`).toBeLessThan(1)
    }
  })
})

describe('deriveYawPitchDeg', () => {
  test('looking straight ahead (-z) is yaw 0, pitch 0', () => {
    const { yawDeg, pitchDeg } = deriveYawPitchDeg([0, 1.6, 0], [0, 1.6, -5])
    expect(yawDeg).toBeCloseTo(0, 6)
    expect(pitchDeg).toBeCloseTo(0, 6)
  })

  test('looking along +x is yaw 90', () => {
    const { yawDeg, pitchDeg } = deriveYawPitchDeg([0, 1.6, 0], [5, 1.6, 0])
    expect(yawDeg).toBeCloseTo(90, 6)
    expect(pitchDeg).toBeCloseTo(0, 6)
  })

  test('looking straight up is pitch 90', () => {
    const { pitchDeg } = deriveYawPitchDeg([0, 0, 0], [0, 5, 0])
    expect(pitchDeg).toBeCloseTo(90, 6)
  })

  test('looking down reads as negative pitch', () => {
    const { pitchDeg } = deriveYawPitchDeg([0, 1.6, 0], [0, 0.6, -1])
    expect(pitchDeg).toBeLessThan(0)
  })
})
