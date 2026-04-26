import { create } from 'zustand'
import { Vector3 } from 'three'
import { isValidLabId, type LabId } from '../config/labs'
import {
  defaultPlaygroundPresetId,
  isValidPresetId,
  THEME_STORAGE_KEY,
} from '../config/playgroundTheme'

const FPS_HUD_STORAGE_KEY = 'xr-playground-fps-hud-visible'
const DEFAULT_ORIGIN_POSITION = new Vector3(0, 0, 0)
const DEFAULT_ORIGIN_ROTATION_Y = 0

function readInitialLabId(): LabId {
  if (typeof window === 'undefined') return 'selection'
  try {
    const q = new URLSearchParams(window.location.search).get('lab')
    if (q && isValidLabId(q)) return q
  } catch {
    /* ignore */
  }
  return 'selection'
}

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

function readInitialBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = localStorage.getItem(key)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    /* ignore */
  }
  return fallback
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

/** A single key/value cell rendered in the in-XR HUD's expanded metrics strip. */
export type HudMetric = { label: string; value: string }
/** Optional trial counter displayed in the HUD's expanded panel header (Manipulation · Docking). */
export type HudTrial = { current: number; total: number; subLabel?: string }
/** Snapshot of state the active lab wants reflected in the in-XR HUD. */
export type HudReport = {
  /** Up to 4 cells fill the expanded panel's metric strip (extras are dropped). */
  metrics: HudMetric[]
  /** Method / context label rendered in the panel footer. */
  methodLabel: string
  /** When non-null, the panel header shows "Trial N / M" plus optional sub-label. */
  trial: HudTrial | null
}

export const defaultHudReport: HudReport = {
  metrics: [],
  methodLabel: '—',
  trial: null,
}

type PlaygroundState = {
  currentLab: LabId
  setLab: (lab: LabId) => void
  themePresetId: string
  setThemePresetId: (id: string) => void
  /** AR-only: world-space alignment ring (see spatial polish plan). */
  arAlignmentGuide: boolean
  setArAlignmentGuide: (visible: boolean) => void
  /** XR-only: show the lightweight in-headset FPS card. */
  fpsHudVisible: boolean
  setFpsHudVisible: (visible: boolean) => void
  originPosition: Vector3
  setOriginPosition: (pos: Vector3) => void
  originRotationY: number
  setOriginRotationY: (yRadians: number) => void
  logEntries: SessionLogEntry[]
  addLogEntry: (entry: SessionLogEntry) => void
  updateLogEntryNote: (id: string, note: string) => void
  clearLogEntries: () => void
  /** Active lab pushes a snapshot here on changes; in-XR HUD reads from it. */
  hudReport: HudReport
  setHudReport: (report: HudReport) => void
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  currentLab: readInitialLabId(),
  setLab: (lab) =>
    set({
      currentLab: lab,
      originPosition: DEFAULT_ORIGIN_POSITION.clone(),
      originRotationY: DEFAULT_ORIGIN_ROTATION_Y,
    }),
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
  fpsHudVisible: readInitialBoolean(FPS_HUD_STORAGE_KEY, true),
  setFpsHudVisible: (visible) => {
    try {
      localStorage.setItem(FPS_HUD_STORAGE_KEY, String(visible))
    } catch {
      /* ignore */
    }
    set({ fpsHudVisible: visible })
  },
  // Session origin transform controlled by locomotion and teleport labs.
  originPosition: DEFAULT_ORIGIN_POSITION.clone(),
  setOriginPosition: (pos) => set({ originPosition: pos }),
  originRotationY: DEFAULT_ORIGIN_ROTATION_Y,
  setOriginRotationY: (yRadians) => set({ originRotationY: yRadians }),
  logEntries: [],
  addLogEntry: (entry) =>
    set((state) => ({ logEntries: [...state.logEntries, entry] })),
  updateLogEntryNote: (id, note) =>
    set((state) => ({
      logEntries: state.logEntries.map((e) => (e.id === id ? { ...e, note } : e)),
    })),
  clearLogEntries: () => set({ logEntries: [] }),
  hudReport: defaultHudReport,
  setHudReport: (report) => set({ hudReport: report }),
}))
