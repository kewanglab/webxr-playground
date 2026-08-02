import { create } from 'zustand'
import { Vector3 } from 'three'
import { isDesktopSyncUnavailable } from './sessionLogSync'
import { isValidLabId, type LabId } from '../config/labs'
import {
  defaultPlaygroundPresetId,
  isValidPresetId,
  THEME_STORAGE_KEY,
  type PlaygroundPresetId,
} from '../config/playgroundTheme'

const FPS_HUD_STORAGE_KEY = 'xr-playground-fps-hud-visible'
const SESSION_LOG_STORAGE_KEY = 'xr-playground-session-log'
/** Keeps a long hosted session from growing the quota-limited store without bound. */
const MAX_PERSISTED_LOG_ENTRIES = 200
/** Coalescing window for note edits — see `persistLogEntries`. */
const PERSIST_DEBOUNCE_MS = 500
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

function readInitialThemePresetId(): PlaygroundPresetId {
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
  /**
   * Optional machine-readable payload alongside the human-readable note —
   * e.g. structured trial results (see `logTrialResult`) for CSV export.
   */
  data?: Record<string, unknown>
}

/**
 * Restore entries kept from an earlier local-only session.
 *
 * Only local-only sessions write here (see `persistLogEntries`), so a `npm run
 * dev` session still starts empty with `logs/session-notes.json` as the record.
 */
function readInitialLogEntries(): SessionLogEntry[] {
  if (typeof window === 'undefined') return []
  if (!isDesktopSyncUnavailable()) return []
  try {
    const raw = localStorage.getItem(SESSION_LOG_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    // Every field the UI reads unguarded has to be present, or a half-written
    // entry surfaces as a React controlled-input warning and "Invalid Date"
    // rather than as the corruption it is.
    return parsed.filter(isRestorableEntry)
  } catch {
    /* ignore — a corrupt or unreadable store just means no history */
    return []
  }
}

function isRestorableEntry(value: unknown): value is SessionLogEntry {
  if (typeof value !== 'object' || value === null) return false
  const e = value as Partial<SessionLogEntry>
  return (
    typeof e.id === 'string' &&
    typeof e.note === 'string' &&
    typeof e.timestamp === 'string' &&
    !Number.isNaN(Date.parse(e.timestamp)) &&
    typeof e.labId === 'string' &&
    isValidLabId(e.labId) &&
    typeof e.inputSource === 'string'
  )
}

function writeLogEntries(entries: SessionLogEntry[]): void {
  try {
    localStorage.setItem(
      SESSION_LOG_STORAGE_KEY,
      JSON.stringify(entries.slice(-MAX_PERSISTED_LOG_ENTRIES)),
    )
  } catch {
    /* ignore — full or blocked storage must not break logging */
  }
}

let persistTimer: number | null = null
let pendingEntries: SessionLogEntry[] | null = null

function flushPendingLogEntries(): void {
  if (persistTimer != null) {
    window.clearTimeout(persistTimer)
    persistTimer = null
  }
  if (pendingEntries == null) return
  writeLogEntries(pendingEntries)
  pendingEntries = null
}

/**
 * With no `/api/logs` to post to, localStorage is the only place a hosted
 * visitor's notes can survive a reload. In dev the desktop file is the record,
 * so nothing is written and the existing workflow is untouched.
 *
 * Note edits arrive per keystroke, and a synchronous `setItem` of up to 200
 * stringified entries on every one is a main-thread hitch inside a 90 fps XR
 * session. Those coalesce; entries appearing or being cleared are structural
 * and write straight through. A pending write is flushed on `pagehide` so the
 * last few characters typed before a tab closes still land.
 */
function persistLogEntries(
  entries: SessionLogEntry[],
  { immediate = false }: { immediate?: boolean } = {},
): void {
  if (typeof window === 'undefined') return
  if (!isDesktopSyncUnavailable()) return

  if (immediate) {
    pendingEntries = entries
    flushPendingLogEntries()
    return
  }

  pendingEntries = entries
  if (persistTimer != null) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    flushPendingLogEntries()
  }, PERSIST_DEBOUNCE_MS)
}

if (typeof window !== 'undefined') {
  // `pagehide` rather than `beforeunload`: it fires on mobile/standalone
  // browser teardown, where `beforeunload` is unreliable.
  window.addEventListener('pagehide', flushPendingLogEntries)
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
  themePresetId: PlaygroundPresetId
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
  logEntries: readInitialLogEntries(),
  addLogEntry: (entry) =>
    set((state) => {
      const logEntries = [...state.logEntries, entry]
      persistLogEntries(logEntries, { immediate: true })
      return { logEntries }
    }),
  updateLogEntryNote: (id, note) =>
    set((state) => {
      const logEntries = state.logEntries.map((e) => (e.id === id ? { ...e, note } : e))
      // Debounced: this fires on every keystroke of the note textarea.
      persistLogEntries(logEntries)
      return { logEntries }
    }),
  clearLogEntries: () => {
    persistLogEntries([], { immediate: true })
    set({ logEntries: [] })
  },
  hudReport: defaultHudReport,
  setHudReport: (report) => set({ hudReport: report }),
}))
