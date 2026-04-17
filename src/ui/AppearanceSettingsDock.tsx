import type { CSSProperties } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { usePlaygroundStore } from '../app/store'
import { playgroundPresets } from '../config/playgroundTheme'
import './appearanceSettingsDock.css'

const v = (name: string) => `var(${name})`

const fab: CSSProperties = {
  position: 'fixed',
  bottom: v('--pg-shell-space-lg'),
  right: v('--pg-shell-space-lg'),
  zIndex: 1001,
  width: 48,
  height: 48,
  padding: 0,
  borderRadius: 999,
  border: `1px solid ${v('--pg-shell-border-default')}`,
  background: v('--pg-shell-bg-panel'),
  color: v('--pg-shell-text-primary'),
  boxShadow: `0 2px 14px ${v('--pg-shell-shadow-soft')}`,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const popover: CSSProperties = {
  position: 'fixed',
  bottom: 'calc(var(--pg-shell-space-lg) + 48px + var(--pg-shell-space-sm))',
  right: v('--pg-shell-space-lg'),
  zIndex: 1001,
  width: 'min(calc(100vw - 2 * var(--pg-shell-space-lg)), 320px)',
  boxSizing: 'border-box',
  padding: v('--pg-shell-space-lg'),
  display: 'flex',
  flexDirection: 'column',
  gap: v('--pg-shell-space-md'),
  fontFamily: v('--pg-shell-font-ui'),
  color: v('--pg-shell-text-primary'),
  background: v('--pg-shell-bg-panel'),
  border: `1px solid ${v('--pg-shell-border-subtle')}`,
  borderRadius: v('--pg-shell-radius-lg'),
  boxShadow: `0 8px 32px ${v('--pg-shell-shadow-soft')}`,
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 600,
  lineHeight: 1.3,
}

const labelRow: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: v('--pg-shell-space-xs'),
}

const controlLabel: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: v('--pg-shell-text-primary'),
}

const hint: CSSProperties = {
  margin: 0,
  fontSize: 12,
  lineHeight: 1.45,
  color: v('--pg-shell-text-muted'),
}

const selectStyle: CSSProperties = {
  minHeight: 44,
  padding: `${v('--pg-shell-space-sm')} ${v('--pg-shell-space-md')}`,
  border: `1px solid ${v('--pg-shell-border-default')}`,
  borderRadius: v('--pg-shell-radius-md'),
  background: v('--pg-shell-bg-control'),
  color: v('--pg-shell-text-primary'),
  fontSize: 14,
  fontFamily: 'inherit',
  cursor: 'pointer',
  width: '100%',
}

const checkRow: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: v('--pg-shell-space-sm'),
  minHeight: 44,
}

const checkbox: CSSProperties = {
  width: 20,
  height: 20,
  marginTop: 2,
  flexShrink: 0,
  accentColor: v('--pg-shell-accent-primary'),
  cursor: 'pointer',
}

const doneBtn: CSSProperties = {
  minHeight: 44,
  padding: `${v('--pg-shell-space-sm')} ${v('--pg-shell-space-md')}`,
  borderRadius: v('--pg-shell-radius-md'),
  border: `1px solid ${v('--pg-shell-border-default')}`,
  background: v('--pg-shell-bg-control'),
  color: v('--pg-shell-text-primary'),
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
  alignSelf: 'flex-start',
}

function PaletteIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3a9 9 0 1 0 9 9c0 .55-.45 1-1 1h-3a2 2 0 0 1-2-2V15a1 1 0 0 0-1-1h-1a5 5 0 1 1 5-5 1 1 0 0 0-1-1Z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="10.5" r="1.25" fill="currentColor" />
      <circle cx="10.5" cy="7.5" r="1.25" fill="currentColor" />
      <circle cx="15" cy="7.5" r="1.25" fill="currentColor" />
    </svg>
  )
}

export function AppearanceSettingsDock() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const fabRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  const themePresetId = usePlaygroundStore((s) => s.themePresetId)
  const setThemePresetId = usePlaygroundStore((s) => s.setThemePresetId)
  const arAlignmentGuide = usePlaygroundStore((s) => s.arAlignmentGuide)
  const setArAlignmentGuide = usePlaygroundStore((s) => s.setArAlignmentGuide)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onPointer = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (fabRef.current?.contains(t)) return
      setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [open])

  return (
    <div className="pg-appearance-dock">
      {open ? (
        <div
          ref={panelRef}
          id="appearance-settings-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          style={popover}
        >
          <h2 id={titleId} style={titleStyle}>
            Appearance
          </h2>

          <label style={labelRow}>
            <span style={controlLabel}>Theme</span>
            <select
              style={selectStyle}
              value={themePresetId}
              onChange={(e) => setThemePresetId(e.target.value)}
              aria-label="Playground theme preset"
            >
              {playgroundPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <div>
            <label style={checkRow}>
              <input
                type="checkbox"
                style={checkbox}
                checked={arAlignmentGuide}
                onChange={(e) => setArAlignmentGuide(e.target.checked)}
              />
              <span style={controlLabel}>AR alignment ring</span>
            </label>
            <p style={{ ...hint, marginTop: v('--pg-shell-space-xs'), paddingLeft: 28 }}>
              Thin floor ring in immersive AR (passthrough) to show scene origin.
            </p>
          </div>

          <button type="button" style={doneBtn} onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      ) : null}

      <button
        ref={fabRef}
        type="button"
        style={fab}
        aria-label="Open appearance settings"
        aria-expanded={open}
        aria-haspopup="dialog"
        {...(open ? { 'aria-controls': 'appearance-settings-panel' } : {})}
        onClick={() => setOpen((o) => !o)}
      >
        <PaletteIcon />
      </button>
    </div>
  )
}
