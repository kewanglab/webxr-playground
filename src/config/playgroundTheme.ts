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
    canvas: '#F0E3D4',
    elevated: '#FBF7EF',
    subtle: '#E8D7CA',
  },
  border: {
    subtle: '#D3BCAC',
    default: '#B99B89',
  },
  text: {
    primary: '#3A2820',
    muted: '#6B5A50',
    inverse: '#FFF7EF',
  },
  accent: {
    primary: '#B9564E',
    primaryHover: '#97463F',
    soft: '#DEA199',
  },
  focus: { ring: '#B9564E' },
  state: {
    success: '#6F8792',
    warning: '#9C6B4E',
    danger: '#8F3C37',
  },
  shadow: { soft: 'rgba(58, 40, 32, 0.08)' },
  overlay: { scrim: 'rgba(58, 40, 32, 0.35)' },
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

const defaultXr: XrTheme = {
  void: { clear: '#1C1B1D' },
  skydome: {
    top: '#28313A',
    horizon: '#866560',
    bottom: '#231F1D',
  },
  fog: {
    color: '#282321',
    near: 7,
    far: 32,
  },
  floor: {
    albedo: '#403A36',
    emissive: '#292522',
  },
  grid: {
    cell: '#706862',
    section: '#D7AEA8',
  },
  light: {
    key: {
      color: '#FFE8D6',
      intensity: 1.08,
      position: [4.5, 7.5, 5.5],
    },
    hemi: {
      sky: '#8298A0',
      ground: '#4A3A34',
      intensity: 0.56,
    },
  },
  accent: {
    cyan: '#829AA2',
    amber: '#DDB2AB',
    orange: '#C85F58',
    mustard: '#9A7A68',
    stone: '#DED2C3',
    seal: '#62504A',
  },
  hud: {
    panelFill: '#51443E',
    panelOpacity: 0.7,
    panelBorder: '#C85F58',
    textPrimary: '#FFF5EA',
    textMetric: '#B4C7CC',
    textMuted: '#E5C9C0',
  },
  ar: {
    stroke: '#829AA2',
    opacity: 0.42,
  },
}

const defaultLabAccents: Record<LabId, LabAccentPair> = {
  selection: { primary: defaultXr.accent.orange, secondary: defaultXr.accent.amber },
  placement: { primary: defaultXr.accent.cyan, secondary: defaultXr.accent.orange },
  locomotion: { primary: defaultXr.accent.cyan, secondary: defaultXr.accent.amber },
  manipulation: { primary: defaultXr.accent.orange, secondary: defaultXr.accent.mustard },
}

const cloudParkShell: ShellTheme = {
  bg: {
    canvas: '#E7F7EF',
    elevated: '#FFF9E9',
    subtle: '#D6F0E5',
  },
  border: {
    subtle: '#A9D5CB',
    default: '#72B7B4',
  },
  text: {
    primary: '#213F43',
    muted: '#557779',
    inverse: '#FFFBEF',
  },
  accent: {
    primary: '#B94F48',
    primaryHover: '#9E413C',
    soft: '#FFD3A4',
  },
  focus: { ring: '#1C8D99' },
  state: {
    success: '#268E7E',
    warning: '#B77921',
    danger: '#A63E42',
  },
  shadow: { soft: 'rgba(33, 63, 67, 0.12)' },
  overlay: { scrim: 'rgba(33, 63, 67, 0.32)' },
  font: { ...defaultShell.font },
  space: { ...defaultShell.space },
  radius: { ...defaultShell.radius },
}

const cloudParkXr: XrTheme = {
  void: { clear: '#98DDF0' },
  skydome: {
    top: '#71C8EB',
    horizon: '#FFE29B',
    bottom: '#B8EFCF',
  },
  fog: {
    color: '#BDECDC',
    near: 14,
    far: 52,
  },
  floor: {
    albedo: '#7ED8AD',
    emissive: '#43AF8E',
  },
  grid: {
    cell: '#DAFFF0',
    section: '#FFD26F',
  },
  light: {
    key: {
      color: '#FFF5C7',
      intensity: 1.28,
      position: [-3.5, 7.5, 4.5],
    },
    hemi: {
      sky: '#C8F2FF',
      ground: '#6CCBA0',
      intensity: 0.74,
    },
  },
  accent: {
    cyan: '#2FAFC6',
    amber: '#FFD166',
    orange: '#E86455',
    mustard: '#B7C95C',
    stone: '#FFF3C8',
    seal: '#2F6971',
  },
  hud: {
    panelFill: '#F2FFF5',
    panelOpacity: 0.78,
    panelBorder: '#E86455',
    textPrimary: '#1D464B',
    textMetric: '#117D91',
    textMuted: '#5A8180',
  },
  ar: {
    stroke: '#2FAFC6',
    opacity: 0.48,
  },
}

const cloudParkLabAccents: Record<LabId, LabAccentPair> = {
  selection: { primary: cloudParkXr.accent.orange, secondary: cloudParkXr.accent.amber },
  placement: { primary: cloudParkXr.accent.cyan, secondary: cloudParkXr.accent.orange },
  locomotion: { primary: cloudParkXr.accent.cyan, secondary: cloudParkXr.accent.amber },
  manipulation: { primary: cloudParkXr.accent.orange, secondary: cloudParkXr.accent.mustard },
}

export const defaultPlaygroundPresetId = 'default'

export const playgroundPresets: PlaygroundThemePreset[] = [
  {
    id: 'default',
    label: 'Warm Night',
    shell: defaultShell,
    xr: defaultXr,
    labAccents: defaultLabAccents,
  },
  {
    id: 'cloud-park',
    label: 'Cloud Park',
    shell: cloudParkShell,
    xr: cloudParkXr,
    labAccents: cloudParkLabAccents,
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
      /** Larger gaps so rows read as separate targets on Quest / hand ray. */
      rowGap: `${shell.space.sm}px`,
      colGap: `${shell.space.sm}px`,
    },
    fonts: {
      mono: shell.font.mono,
      sans: shell.font.ui,
    },
    fontSizes: {
      /** Slightly larger than desktop-default Leva for arm’s-length UI. */
      root: '15px',
    },
    sizes: {
      rootWidth: '460px',
      controlWidth: '248px',
      numberInputMinWidth: '52px',
      scrubberWidth: '14px',
      scrubberHeight: '28px',
      rowHeight: '48px',
      folderTitleHeight: '36px',
      checkboxSize: '26px',
      titleBarHeight: '48px',
      colorPickerWidth: '$controlWidth',
      colorPickerHeight: '120px',
      imagePreviewWidth: '$controlWidth',
      imagePreviewHeight: '120px',
      monitorHeight: '72px',
      joystickWidth: '120px',
      joystickHeight: '120px',
    },
  }
}
