import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  readCaptureMode,
  readCaptureViewId,
  readDirectorPaused,
  readDirectorPresetId,
  readDirectorSeek,
} from '../../src/app/captureOptions'

function stubSearch(search: string) {
  vi.stubGlobal('window', { location: { search } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readCaptureMode', () => {
  test('returns null outside a browser', () => {
    expect(readCaptureMode()).toBeNull()
  })

  test('parses ui and scene, rejects anything else', () => {
    stubSearch('?capture=scene')
    expect(readCaptureMode()).toBe('scene')

    stubSearch('?capture=ui')
    expect(readCaptureMode()).toBe('ui')

    stubSearch('?capture=banana')
    expect(readCaptureMode()).toBeNull()
  })
})

describe('readCaptureViewId', () => {
  test('falls back to the headset POV when missing or unknown', () => {
    stubSearch('')
    expect(readCaptureViewId()).toBe('headset')

    stubSearch('?captureView=fisheye')
    expect(readCaptureViewId()).toBe('headset')
  })

  test('accepts every authored view id', () => {
    for (const view of ['headset', 'hero', 'side', 'overhead', 'wide']) {
      stubSearch(`?captureView=${view}`)
      expect(readCaptureViewId()).toBe(view)
    }
  })
})

describe('director params', () => {
  test('preset id passes through, empty means off', () => {
    stubSearch('?director=concept-b')
    expect(readDirectorPresetId()).toBe('concept-b')

    stubSearch('')
    expect(readDirectorPresetId()).toBeNull()
  })

  test('seek parses non-negative integers only', () => {
    stubSearch('?seek=7')
    expect(readDirectorSeek()).toBe(7)

    stubSearch('?seek=-1')
    expect(readDirectorSeek()).toBeNull()

    stubSearch('?seek=abc')
    expect(readDirectorSeek()).toBeNull()

    stubSearch('')
    expect(readDirectorSeek()).toBeNull()
  })

  test('pause requires the literal value 1', () => {
    stubSearch('?pause=1')
    expect(readDirectorPaused()).toBe(true)

    stubSearch('?pause=true')
    expect(readDirectorPaused()).toBe(false)
  })
})
