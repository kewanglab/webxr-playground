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

/**
 * Selection-target orb state colors per design handoff spec (Section 02 · Materials).
 * Source: design-handoff-v0.2 tag → docs/design-handoff/project/XR Themes Design.html, TOKENS_JSON.
 * Not yet wired into runtime — reserved for Phase 2+ rewrites.
 */
export type OrbStateColors = {
  core: string
  mid: string
  rim: string
  base: string
}

export type OrbTargetedState = OrbStateColors & {
  /** Inner concentric ring, pulses at 1.2 Hz ±15% opacity. */
  ring: string
  /** Outer ring at visual r + 45mm. */
  ringOuter: string
  /** Ember shadow color for WN targeted glow (blur 12). CP omits — uses higher ring alpha instead. */
  ringGlow?: string
}

export type OrbConfirmedState = OrbStateColors & {
  /** Radial halo gradient, peaks at r×2, fades over 400 ms hold. */
  halo: string
}

export type OrbTheme = {
  idle: OrbStateColors
  targeted: OrbTargetedState
  confirmed: OrbConfirmedState
}

/** Tint colors for per-method affordance hints (ray arrow, pinch calipers, touch ring, etc.). */
export type AffordanceTheme = {
  rayArrow: string
  pinchCalipers: string
  touchRing: string
  controllerRay: string
  proximityRing: string
  dockEmpty: string
  dockActive: string
}

/** Recipe for a rim / outline glow — canvas shadow in 2D; additive bloom pass in engine. */
export type GlowRecipe = {
  /** If omitted, no shadow is drawn (flat stroke only). */
  shadowColor?: string
  shadowBlur: number
  strokeWidth: number
  note?: string
}

export type GlowRecipes = {
  archRim: GlowRecipe
  /** WN-only: ember glow around central stage base. */
  platformEmber?: GlowRecipe
  /** Outer border of HUD pill / panel. */
  hudBorder: GlowRecipe
  /** WN-only: ember bloom on targeted orb. CP omits in favor of higher alpha. */
  targetedOrb?: GlowRecipe
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
  /** Selection-target orb colors per state — design handoff v0.2. */
  orb: OrbTheme
  /** Per-method affordance hint tint colors. */
  affordance: AffordanceTheme
  /** Rim / bloom glow recipes — canvas shadow values, engine-side additive hints. */
  glow: GlowRecipes
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
  // Warm Night orb / affordance / glow tokens per design-handoff-v0.2.
  // TOKENS_JSON['warm-night'] in docs/design-handoff/project/XR Themes Design.html.
  orb: {
    idle: { core: '#F5EDE0', mid: '#6E5E50', rim: '#281C10', base: '#6E5E50' },
    targeted: {
      core: '#F5EDE0',
      mid: '#B58866',
      rim: '#3E2818',
      base: '#C85F58',
      ring: 'rgba(200,95,88,.8)',
      ringOuter: 'rgba(200,95,88,.52)',
      ringGlow: 'rgba(200,95,88,.5)',
    },
    confirmed: {
      core: '#F5EDE0',
      mid: '#8ABFB0',
      rim: '#2F6A5E',
      base: '#7FD4B8',
      halo: 'rgba(140,220,195,.3)',
    },
  },
  affordance: {
    rayArrow: 'rgba(200,95,88,.45)',
    pinchCalipers: 'rgba(240,170,100,.88)',
    touchRing: 'rgba(130,200,180,.7)',
    controllerRay: 'rgba(200,95,88,.85)',
    proximityRing: 'rgba(200,95,88,.35)',
    dockEmpty: 'rgba(200,95,88,.45)',
    dockActive: 'rgba(160,200,220,.75)',
  },
  glow: {
    archRim: {
      shadowColor: 'rgba(200,95,88,.5)',
      shadowBlur: 18,
      strokeWidth: 4,
      note: 'Ember ring; additive pass in engine.',
    },
    platformEmber: {
      shadowColor: 'rgba(200,95,88,.45)',
      shadowBlur: 10,
      strokeWidth: 2,
      note: 'Around base of central stage only.',
    },
    hudBorder: {
      shadowColor: 'rgba(200,95,88,.84)',
      shadowBlur: 7,
      strokeWidth: 1.4,
      note: 'Fallback: CSS box-shadow on HTML layer.',
    },
    targetedOrb: {
      shadowColor: 'rgba(200,95,88,.5)',
      shadowBlur: 12,
      strokeWidth: 2,
      note: 'Mirrors orb.targeted.ringGlow. CP omits.',
    },
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
    canvas: '#EAF8F1',
    elevated: '#FFF8E8',
    subtle: '#DDF3E8',
  },
  border: {
    subtle: '#B6DDD2',
    default: '#76BBB6',
  },
  text: {
    primary: '#24484B',
    muted: '#5D7F7E',
    inverse: '#FFF9EC',
  },
  accent: {
    primary: '#D65F55',
    primaryHover: '#B94B45',
    soft: '#FFE0B6',
  },
  focus: { ring: '#238F9F' },
  state: {
    success: '#2B9A86',
    warning: '#C3852C',
    danger: '#B6474C',
  },
  shadow: { soft: 'rgba(36, 72, 75, 0.14)' },
  overlay: { scrim: 'rgba(36, 72, 75, 0.3)' },
  font: { ...defaultShell.font },
  space: { ...defaultShell.space },
  radius: { ...defaultShell.radius },
}

const cloudParkXr: XrTheme = {
  void: { clear: '#9ADFF0' },
  skydome: {
    top: '#83D5ED',
    horizon: '#FFE4A8',
    bottom: '#BDEFD2',
  },
  fog: {
    color: '#C7F0DE',
    near: 14,
    far: 52,
  },
  floor: {
    albedo: '#91DBAE',
    emissive: '#4BB694',
  },
  grid: {
    cell: '#E6FFF4',
    section: '#FFD985',
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
    cyan: '#2EAEC3',
    amber: '#FFD166',
    orange: '#E76456',
    mustard: '#BED36A',
    stone: '#FFF2C7',
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
  // Cloud Park orb / affordance / glow tokens per design-handoff-v0.2.
  // TOKENS_JSON['cloud-park'] in docs/design-handoff/project/XR Themes Design.html.
  orb: {
    idle: { core: '#FFFAEE', mid: '#EDD8A0', rim: '#C4A070', base: '#C9A86C' },
    targeted: {
      core: '#FFFAEE',
      mid: '#FFDF8A',
      rim: '#E0A840',
      base: '#FFD166',
      ring: 'rgba(255,209,102,.78)',
      ringOuter: 'rgba(255,209,102,.50)',
    },
    confirmed: {
      core: '#FFFAEE',
      mid: '#B8E8CC',
      rim: '#6DCFAA',
      base: '#6DCFAA',
      halo: 'rgba(109,207,170,.32)',
    },
  },
  affordance: {
    rayArrow: 'rgba(255,209,102,.35)',
    pinchCalipers: 'rgba(255,209,102,.8)',
    touchRing: 'rgba(109,207,170,.75)',
    controllerRay: 'rgba(230,100,86,.8)',
    proximityRing: 'rgba(255,209,102,.38)',
    dockEmpty: 'rgba(255,209,102,.45)',
    dockActive: 'rgba(47,175,198,.7)',
  },
  glow: {
    archRim: {
      shadowBlur: 0,
      strokeWidth: 4,
      note: 'No bloom in bright daytime; keep flat.',
    },
    hudBorder: {
      shadowColor: 'rgba(255,209,102,.88)',
      shadowBlur: 7,
      strokeWidth: 1.4,
      note: 'Fallback: CSS box-shadow on HTML layer.',
    },
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
    label: 'Patina Instrument Lab',
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

/**
 * Typography tokens shared across both themes per design handoff v0.2.
 * Not yet applied to existing UI — reserved for Phase 2+ rewrites.
 * Existing `ShellTheme.font` strings remain the runtime source for current callers.
 */
export type TypographyScalePx = {
  hudFpsMin: number
  hudFpsExp: number
  hudMetric: number
  hudMuted: number
  hudLabel: number
  sceneLabel: number
  sceneSub: number
  stateTag: number
  shellH1: number
  shellBody: number
  shellMuted: number
}

export type TypographyWeights = {
  regular: number
  medium: number
  semibold: number
  bold: number
}

export type TypographyTokens = {
  sans: string
  mono: string
  scalePx: TypographyScalePx
  weights: TypographyWeights
}

export const TYPOGRAPHY: TypographyTokens = {
  sans: '"DM Sans", ui-sans-serif, system-ui, sans-serif',
  mono: '"DM Mono", ui-monospace, SFMono-Regular, monospace',
  scalePx: {
    hudFpsMin: 16,
    hudFpsExp: 32,
    hudMetric: 13.5,
    hudMuted: 11,
    hudLabel: 9,
    sceneLabel: 11,
    sceneSub: 10,
    stateTag: 9.5,
    shellH1: 16,
    shellBody: 12.5,
    shellMuted: 11,
  },
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
}

/**
 * HUD pill / panel dimensions shared across both themes per design handoff v0.2.
 * All values in CSS pixels; `strokeW` is border width.
 */
export type HudDimensions = {
  minimizedW: number
  minimizedH: number
  expandedW: number
  expandedMinH: number
  radiusMin: number
  radiusExp: number
  strokeW: number
  panelShadow: string
}

export const HUD_DIMS: HudDimensions = {
  minimizedW: 158,
  minimizedH: 38,
  expandedW: 295,
  expandedMinH: 168,
  radiusMin: 19,
  radiusExp: 13,
  strokeW: 1.4,
  panelShadow: '0 6px 28px rgba(0,0,0,.5)',
}

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
