import { beforeEach, describe, expect, test } from 'vitest'
import { Vector3 } from 'three'
import { defaultHudReport, usePlaygroundStore } from '../../src/app/store'

beforeEach(() => {
  usePlaygroundStore.setState(usePlaygroundStore.getInitialState(), true)
})

describe('lab switching', () => {
  test('defaults to the selection lab outside a browser', () => {
    expect(usePlaygroundStore.getState().currentLab).toBe('selection')
  })

  test('setLab switches the current lab', () => {
    usePlaygroundStore.getState().setLab('manipulation')
    expect(usePlaygroundStore.getState().currentLab).toBe('manipulation')
  })

  test('setLab resets the session origin so locomotion state never leaks across labs', () => {
    const { setOriginPosition, setOriginRotationY } = usePlaygroundStore.getState()
    setOriginPosition(new Vector3(3, 0, -4))
    setOriginRotationY(Math.PI / 2)

    usePlaygroundStore.getState().setLab('locomotion')

    const state = usePlaygroundStore.getState()
    expect(state.originPosition.length()).toBe(0)
    expect(state.originRotationY).toBe(0)
  })
})

describe('theme preset', () => {
  test('rejects unknown preset ids', () => {
    const before = usePlaygroundStore.getState().themePresetId
    usePlaygroundStore.getState().setThemePresetId('not-a-theme')
    expect(usePlaygroundStore.getState().themePresetId).toBe(before)
  })

  test('accepts a valid preset id', () => {
    usePlaygroundStore.getState().setThemePresetId('cloud-park')
    expect(usePlaygroundStore.getState().themePresetId).toBe('cloud-park')
  })
})

describe('session log', () => {
  const entry = {
    id: 'e1',
    timestamp: '2026-07-20T00:00:00Z',
    labId: 'selection' as const,
    mode: 'immersive-vr' as const,
    inputSource: 'hand' as const,
    note: 'pinch felt sticky',
  }

  test('addLogEntry appends', () => {
    usePlaygroundStore.getState().addLogEntry(entry)
    usePlaygroundStore.getState().addLogEntry({ ...entry, id: 'e2', note: 'second' })

    const notes = usePlaygroundStore.getState().logEntries.map((e) => e.note)
    expect(notes).toEqual(['pinch felt sticky', 'second'])
  })

  test('updateLogEntryNote edits only the matching entry', () => {
    usePlaygroundStore.getState().addLogEntry(entry)
    usePlaygroundStore.getState().addLogEntry({ ...entry, id: 'e2', note: 'second' })

    usePlaygroundStore.getState().updateLogEntryNote('e1', 'revised')

    const notes = usePlaygroundStore.getState().logEntries.map((e) => e.note)
    expect(notes).toEqual(['revised', 'second'])
  })

  test('clearLogEntries empties the log', () => {
    usePlaygroundStore.getState().addLogEntry(entry)
    usePlaygroundStore.getState().clearLogEntries()
    expect(usePlaygroundStore.getState().logEntries).toEqual([])
  })
})

describe('HUD report', () => {
  test('starts with the placeholder report', () => {
    expect(usePlaygroundStore.getState().hudReport).toEqual(defaultHudReport)
  })

  test('setHudReport replaces the snapshot', () => {
    usePlaygroundStore.getState().setHudReport({
      metrics: [{ label: 'FPS', value: '72' }],
      methodLabel: 'Hand Ray',
      trial: { current: 2, total: 10 },
    })

    const report = usePlaygroundStore.getState().hudReport
    expect(report.methodLabel).toBe('Hand Ray')
    expect(report.trial?.current).toBe(2)
  })
})
