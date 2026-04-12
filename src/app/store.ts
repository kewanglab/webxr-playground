import { create } from 'zustand'
import { Vector3 } from 'three'
import type { LabId } from '../config/labs'
import {
  defaultPlaygroundPresetId,
  isValidPresetId,
  THEME_STORAGE_KEY,
} from '../config/playgroundTheme'

function readInitialThemePresetId(): string {
  if (typeof window === 'undefined') return defaultPlaygroundPresetId
  try {
    const q = new URLSearchParams(window.location.search).get('theme')
    if (q && isValidPresetId(q)) return q
    const s = localStorage.getItem(THEME_STORAGE_KEY)
    if (s && isValidPresetId(s)) return s
  } catch {
    /* ignore */
  }
  return defaultPlaygroundPresetId
}

export type SessionLogEntry = {
  id: string
  timestamp: string
  labId: LabId
  mode: 'immersive-vr' | 'immersive-ar' | 'inline' | null
  inputSource: 'controller' | 'hand' | 'mixed'
  note: string
  /** True when the entry was created from the in-XR HUD (used to open the notes tab after exiting XR). */
  fromHeadset?: boolean
}

type PlaygroundState = {
  currentLab: LabId
  setLab: (lab: LabId) => void
  themePresetId: string
  setThemePresetId: (id: string) => void
  /** AR-only: world-space alignment ring (see spatial polish plan). */
  arAlignmentGuide: boolean
  setArAlignmentGuide: (visible: boolean) => void
  originPosition: Vector3
  setOriginPosition: (pos: Vector3) => void
  originRotationY: number
  setOriginRotationY: (yRadians: number) => void
  logEntries: SessionLogEntry[]
  addLogEntry: (entry: SessionLogEntry) => void
  updateLogEntryNote: (id: string, note: string) => void
  clearLogEntries: () => void
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  currentLab: 'selection',
  setLab: (lab) => set({ currentLab: lab }),
  themePresetId: readInitialThemePresetId(),
  setThemePresetId: (id) => {
    if (!isValidPresetId(id)) return
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id)
      const u = new URL(window.location.href)
      u.searchParams.set('theme', id)
      window.history.replaceState(null, '', `${u.pathname}${u.search}${u.hash}`)
    } catch {
      /* ignore */
    }
    set({ themePresetId: id })
  },
  arAlignmentGuide: true,
  setArAlignmentGuide: (visible) => set({ arAlignmentGuide: visible }),
  // Session origin transform controlled by locomotion and teleport labs.
  originPosition: new Vector3(0, 0, 0),
  setOriginPosition: (pos) => set({ originPosition: pos }),
  originRotationY: 0,
  setOriginRotationY: (yRadians) => set({ originRotationY: yRadians }),
  logEntries: [],
  addLogEntry: (entry) =>
    set((state) => ({ logEntries: [...state.logEntries, entry] })),
  updateLogEntryNote: (id, note) =>
    set((state) => ({
      logEntries: state.logEntries.map((e) => (e.id === id ? { ...e, note } : e)),
    })),
  clearLogEntries: () => set({ logEntries: [] }),
}))
