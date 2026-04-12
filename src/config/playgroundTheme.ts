import type { LabId } from './labs'

/** Persisted preset id (`localStorage` + optional `?theme=`). */
export const THEME_STORAGE_KEY = 'xr-playground-theme'

export type ShellTheme = {
  bg: {
    canvas: string
    elevated: string
    subtle: string
  }
  border: {
    subtle: string
    default: string
  }
  text: {
    primary: string
    muted: string
    inverse: string
  }
  accent: {
    primary: string
    primaryHover: string
    soft: string
  }
  focus: { ring: string }
  state: {
    success: string
    warning: string
    danger: string
  }
  shadow: { soft: string }
  overlay: { scrim: string }
  font: {
    ui: string
    mono: string
  }
  space: {
    micro: number
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
    xxl: number
  }
  radius: {
    sm: number
    md: number
    lg: number
  }
}

export type XrTheme = {
  void: { clear: string }
  skydome: { top: string; horizon: string; bottom: string }
  fog: { color: string; near: number; far: number }
  floor: { albedo: string; emissive: string }
  grid: { cell: string; section: string }
  light: {
    key: { color: string; intensity: number; position: [number, number, number] }
    hemi: { sky: string; ground: string; intensity: number }
  }
  accent: {
    cyan: string
    amber: string
    orange: string
    mustard: string
    stone: string
    seal: string
  }
  hud: {
    panelFill: string
    panelOpacity: number
    panelBorder: string
    textPrimary: string
    textMetric: string
    textMuted: string
  }
  ar: { stroke: string; opacity: number }
}

export type LabAccentPair = { primary: string; secondary: string }

export type PlaygroundThemePreset = {
  id: string
  label: string
  shell: ShellTheme
  xr: XrTheme
  labAccents: Record<LabId, LabAccentPair>
}

const defaultShell: ShellTheme = {
  bg: {
    canvas: '#EBE4DC',
    elevated: '#F5EFE8',
    subtle: '#E3D9CF',
  },
  border: {
    subtle: '#C9B8A8',
    default: '#B0A090',
  },
  text: {
    primary: '#2A221C',
    muted: '#5C524C',
    inverse: '#F5EFE8',
  },
  accent: {
    primary: '#C4706A',
    primaryHover: '#A85A55',
    soft: '#E8C4BE',
  },
  focus: { ring: '#C4706A' },
  state: {
    success: '#4A7C6A',
    warning: '#B8860B',
    danger: '#9B3B3B',
  },
  shadow: { soft: 'rgba(42, 34, 28, 0.08)' },
  overlay: { scrim: 'rgba(42, 34, 28, 0.35)' },
  font: {
    ui: 'ui-sans-serif, "SF Pro Text", "Segoe UI", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", "Cascadia Code", monospace',
  },
  space: {
    micro: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
  },
}

const shellCool: ShellTheme = {
  ...defaultShell,
  bg: {
    canvas: '#EEF1F4',
    elevated: '#F8FAFC',
    subtle: '#E2E8F0',
  },
  border: {
    subtle: '#CBD5E1',
    default: '#94A3B8',
  },
  text: {
    primary: '#0F172A',
    muted: '#475569',
    inverse: '#F8FAFC',
  },
  accent: {
    primary: '#0F766E',
    primaryHover: '#0D9488',
    soft: '#99F6E4',
  },
  focus: { ring: '#0F766E' },
}

const defaultXr: XrTheme = {
  void: { clear: '#0B0614' },
  skydome: {
    top: '#1a0b2e',
    horizon: '#3d1f0f',
    bottom: '#120a18',
  },
  fog: {
    color: '#120a18',
    near: 8,
    far: 35,
  },
  floor: {
    albedo: '#1e1428',
    emissive: '#120818',
  },
  grid: {
    cell: '#3d3550',
    section: '#f59e0b',
  },
  light: {
    key: {
      color: '#FFE8D2',
      intensity: 1.0,
      position: [5, 8, 5],
    },
    hemi: {
      sky: '#6B8CFF',
      ground: '#2A1810',
      intensity: 0.35,
    },
  },
  accent: {
    cyan: '#22d3ee',
    amber: '#f59e0b',
    orange: '#ea580c',
    mustard: '#d97706',
    stone: '#a8a29e',
    seal: '#78350f',
  },
  hud: {
    panelFill: '#1c1917',
    panelOpacity: 0.82,
    panelBorder: '#d97706',
    textPrimary: '#e7e5e4',
    textMetric: '#99f6e4',
    textMuted: '#a8a29e',
  },
  ar: {
    stroke: '#22d3ee',
    opacity: 0.35,
  },
}

const defaultLabAccents: Record<LabId, LabAccentPair> = {
  selection: { primary: defaultXr.accent.orange, secondary: defaultXr.accent.amber },
  placement: { primary: defaultXr.accent.cyan, secondary: defaultXr.accent.orange },
  locomotion: { primary: defaultXr.accent.cyan, secondary: defaultXr.accent.amber },
  manipulation: { primary: defaultXr.accent.orange, secondary: defaultXr.accent.mustard },
}

export const defaultPlaygroundPresetId = 'default'

export const playgroundPresets: PlaygroundThemePreset[] = [
  {
    id: 'default',
    label: 'Default',
    shell: defaultShell,
    xr: defaultXr,
    labAccents: defaultLabAccents,
  },
  {
    id: 'shellCool',
    label: 'Cool shell',
    shell: shellCool,
    xr: defaultXr,
    labAccents: defaultLabAccents,
  },
]

export function isValidPresetId(id: string): boolean {
  return playgroundPresets.some((p) => p.id === id)
}

export function getPlaygroundPreset(id: string): PlaygroundThemePreset {
  return playgroundPresets.find((p) => p.id === id) ?? playgroundPresets[0]
}

/** Leva panel theme derived from shell tokens (partial merge). */
export function levaThemeFromShell(shell: ShellTheme) {
  return {
    colors: {
      elevation1: shell.bg.elevated,
      elevation2: shell.bg.subtle,
      elevation3: shell.bg.canvas,
      accent1: shell.accent.primary,
      accent2: shell.accent.primaryHover,
      accent3: shell.accent.soft,
      highlight1: shell.text.primary,
      highlight2: shell.text.muted,
      highlight3: shell.border.subtle,
      vivid1: shell.state.danger,
      vivid2: shell.state.success,
    },
    radii: {
      xs: `${shell.radius.sm}px`,
      sm: `${shell.radius.md}px`,
      lg: `${shell.radius.lg}px`,
    },
    space: {
      sm: `${shell.space.xs}px`,
      md: `${shell.space.sm}px`,
      lg: `${shell.space.md}px`,
    },
    fonts: {
      mono: shell.font.mono,
      sans: shell.font.ui,
    },
    fontSizes: {
      root: '14px',
    },
    sizes: {
      rootWidth: '460px',
      controlWidth: '200px',
      rowHeight: '40px',
    },
  }
}
