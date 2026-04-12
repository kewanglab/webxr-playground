import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { xrStore } from '../xr/core/xrStore'
import { usePlaygroundStore } from '../app/store'
import { labs } from '../config/labs'
import { playgroundPresets } from '../config/playgroundTheme'
import type { XRMode } from '../config/labs'

function modeBadgeLabel(mode: XRMode): string {
  if (mode === 'cross-xr') return 'cross-xr'
  return mode.toUpperCase()
}

const shellVar = (name: string) => `var(${name})`

const bar: CSSProperties = {
  position: 'fixed',
  bottom: shellVar('--pg-shell-space-lg'),
  left: shellVar('--pg-shell-space-lg'),
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: shellVar('--pg-shell-space-sm'),
  maxWidth: 'min(96vw, 720px)',
  fontFamily: shellVar('--pg-shell-font-ui'),
}

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: shellVar('--pg-shell-space-sm'),
}

const btnBase: CSSProperties = {
  padding: `${shellVar('--pg-shell-space-md')} ${shellVar('--pg-shell-space-xl')}`,
  border: `1px solid ${shellVar('--pg-shell-border-default')}`,
  borderRadius: shellVar('--pg-shell-radius-md'),
  background: shellVar('--pg-shell-bg-subtle'),
  color: shellVar('--pg-shell-text-primary'),
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'inherit',
  transition: 'background 0.15s ease, border-color 0.15s ease',
}

const btnSession: CSSProperties = {
  ...btnBase,
  borderColor: shellVar('--pg-shell-accent-primary'),
  background: shellVar('--pg-shell-bg-elevated'),
  color: shellVar('--pg-shell-accent-primary'),
  fontWeight: 600,
}

const btnSessionDisabled: CSSProperties = {
  ...btnSession,
  opacity: 0.45,
  cursor: 'not-allowed',
}

const btnChipActive: CSSProperties = {
  ...btnBase,
  background: shellVar('--pg-shell-accent-soft'),
  borderColor: shellVar('--pg-shell-accent-primary'),
  fontWeight: 600,
}

const divider: CSSProperties = {
  width: 1,
  height: 24,
  background: shellVar('--pg-shell-border-subtle'),
  margin: `0 ${shellVar('--pg-shell-space-xs')}`,
}

const metaText: CSSProperties = {
  fontSize: 13,
  color: shellVar('--pg-shell-text-muted'),
  lineHeight: 1.45,
}

const badge: CSSProperties = {
  display: 'inline-block',
  padding: `${shellVar('--pg-shell-space-micro')} ${shellVar('--pg-shell-space-sm')}`,
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.02em',
  border: `1px solid ${shellVar('--pg-shell-border-subtle')}`,
  background: shellVar('--pg-shell-bg-subtle'),
  color: shellVar('--pg-shell-text-muted'),
  marginRight: shellVar('--pg-shell-space-sm'),
}

const themeSelect: CSSProperties = {
  ...btnBase,
  padding: `${shellVar('--pg-shell-space-xs')} ${shellVar('--pg-shell-space-md')}`,
  fontSize: 13,
  maxWidth: 200,
}

export function PlaygroundControls() {
  const currentLab = usePlaygroundStore((s) => s.currentLab)
  const setLab = usePlaygroundStore((s) => s.setLab)
  const themePresetId = usePlaygroundStore((s) => s.themePresetId)
  const setThemePresetId = usePlaygroundStore((s) => s.setThemePresetId)
  const arAlignmentGuide = usePlaygroundStore((s) => s.arAlignmentGuide)
  const setArAlignmentGuide = usePlaygroundStore((s) => s.setArAlignmentGuide)
  const [xrMode, setXrMode] = useState(() => xrStore.getState().mode)

  useEffect(() => {
    const t = setInterval(() => setXrMode(xrStore.getState().mode), 250)
    return () => clearInterval(t)
  }, [])

  const inSession = xrMode != null
  const activeLab = labs.find((l) => l.id === currentLab)!

  return (
    <div style={bar}>
      <div style={row}>
        <label style={{ ...metaText, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Theme</span>
          <select
            style={themeSelect}
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
        <label
          style={{
            ...metaText,
            display: 'flex',
            alignItems: 'center',
            gap: shellVar('--pg-shell-space-xs'),
            marginLeft: shellVar('--pg-shell-space-sm'),
          }}
        >
          <input
            type="checkbox"
            checked={arAlignmentGuide}
            onChange={(e) => setArAlignmentGuide(e.target.checked)}
          />
          AR alignment ring
        </label>
      </div>

      <div style={row}>
        <span style={{ ...metaText, fontWeight: 600, marginRight: 4 }}>Session</span>
        <button
          type="button"
          style={inSession ? btnSessionDisabled : btnSession}
          disabled={inSession}
          onClick={() => {
            if (xrStore.getState().mode == null) xrStore.enterVR()
          }}
        >
          Enter VR
        </button>
        <button
          type="button"
          style={inSession ? btnSessionDisabled : btnSession}
          disabled={inSession}
          onClick={() => {
            if (xrStore.getState().mode == null) xrStore.enterAR()
          }}
        >
          Enter AR
        </button>
        <div style={divider} aria-hidden />
        <span style={{ ...metaText, fontWeight: 600, marginRight: 4 }}>Experiments</span>
        {labs.map((lab) => (
          <button
            key={lab.id}
            type="button"
            style={currentLab === lab.id ? btnChipActive : btnBase}
            onClick={() => setLab(lab.id)}
            title={lab.description}
          >
            {lab.name}
          </button>
        ))}
      </div>

      <div style={{ ...row, alignItems: 'flex-start' }}>
        <span style={badge}>{modeBadgeLabel(activeLab.mode)}</span>
        <span style={metaText}>
          <strong style={{ color: shellVar('--pg-shell-text-primary') }}>{activeLab.name}</strong>
          {' — '}
          {activeLab.description}
        </span>
      </div>

      {inSession && (
        <div style={{ ...metaText, fontSize: 12 }}>XR session active — session buttons disabled.</div>
      )}
    </div>
  )
}
