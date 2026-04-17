import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { xrStore } from '../xr/core/xrStore'
import { usePlaygroundStore } from '../app/store'
import { labs, type XRMode } from '../config/labs'
import './playgroundControls.css'

/** Platform tags for the active lab (cross-xr shows both VR and AR). */
function modeTags(mode: XRMode): ('VR' | 'AR')[] {
  if (mode === 'cross-xr') return ['VR', 'AR']
  if (mode === 'vr') return ['VR']
  return ['AR']
}

const shellVar = (name: string) => `var(${name})`

const panel: CSSProperties = {
  position: 'fixed',
  bottom: shellVar('--pg-shell-space-lg'),
  left: shellVar('--pg-shell-space-lg'),
  zIndex: 10,
  boxSizing: 'border-box',
  maxWidth: 'min(calc(100vw - 2 * var(--pg-shell-space-lg)), 640px)',
  padding: shellVar('--pg-shell-space-lg'),
  display: 'flex',
  flexDirection: 'column',
  gap: shellVar('--pg-shell-space-md'),
  fontFamily: shellVar('--pg-shell-font-ui'),
  color: shellVar('--pg-shell-text-primary'),
  background: shellVar('--pg-shell-bg-panel'),
  border: `1px solid ${shellVar('--pg-shell-border-subtle')}`,
  borderRadius: shellVar('--pg-shell-radius-lg'),
  boxShadow: `0 4px 28px ${shellVar('--pg-shell-shadow-soft')}`,
}

const labChipGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: shellVar('--pg-shell-space-md'),
  width: '100%',
}

const sessionRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: shellVar('--pg-shell-space-md'),
  alignItems: 'stretch',
}

const panelTitle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 600,
  lineHeight: 1.25,
  letterSpacing: '-0.02em',
  color: shellVar('--pg-shell-text-primary'),
}

const panelSubtitle: CSSProperties = {
  margin: `${shellVar('--pg-shell-space-xs')} 0 0 0`,
  fontSize: 13,
  lineHeight: 1.45,
  color: shellVar('--pg-shell-text-muted'),
}

const inputLike: CSSProperties = {
  minHeight: 44,
  padding: `${shellVar('--pg-shell-space-sm')} ${shellVar('--pg-shell-space-lg')}`,
  border: `1px solid ${shellVar('--pg-shell-border-default')}`,
  borderRadius: shellVar('--pg-shell-radius-md'),
  background: shellVar('--pg-shell-bg-control'),
  color: shellVar('--pg-shell-text-primary'),
  fontSize: 14,
  fontFamily: 'inherit',
  cursor: 'pointer',
  transition: 'border-color 0.15s ease, background 0.15s ease',
}

const btnBase: CSSProperties = {
  ...inputLike,
  fontWeight: 500,
}

const btnChipActive: CSSProperties = {
  ...btnBase,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  background: shellVar('--pg-shell-accent-soft'),
  borderColor: shellVar('--pg-shell-accent-primary'),
  borderWidth: 2,
  color: shellVar('--pg-shell-text-primary'),
  fontWeight: 600,
}

const btnChip: CSSProperties = {
  ...btnBase,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  minWidth: 0,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

/** Secondary session action — outline, not filled. */
const btnSessionSecondary: CSSProperties = {
  ...btnBase,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  borderColor: shellVar('--pg-shell-accent-primary'),
  background: shellVar('--pg-shell-bg-control'),
  color: shellVar('--pg-shell-accent-primary'),
  fontWeight: 600,
  flex: '1 1 0',
  minWidth: 140,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

/** Primary session action — filled accent. */
const btnSessionPrimary: CSSProperties = {
  ...btnBase,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  borderColor: shellVar('--pg-shell-accent-primary'),
  background: shellVar('--pg-shell-accent-primary'),
  color: shellVar('--pg-shell-text-inverse'),
  fontWeight: 600,
  flex: '1 1 0',
  minWidth: 140,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

/** Layout only — disabled visuals live in `playgroundControls.css` (`.pg-session-btn:disabled`). */
const btnSessionDisabled: CSSProperties = {
  ...btnBase,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 2,
  fontWeight: 600,
  flex: '1 1 0',
  minWidth: 140,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const metaLine: CSSProperties = {
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: shellVar('--pg-shell-text-primary'),
}

const metaMuted: CSSProperties = {
  ...metaLine,
  fontSize: 13,
  color: shellVar('--pg-shell-text-muted'),
}

const tagRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: shellVar('--pg-shell-space-xs'),
}

const badge: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  flexShrink: 0,
  padding: `${shellVar('--pg-shell-space-xs')} ${shellVar('--pg-shell-space-sm')}`,
  borderRadius: 999,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.02em',
  border: `1px solid ${shellVar('--pg-shell-border-default')}`,
  background: shellVar('--pg-shell-bg-control'),
  color: shellVar('--pg-shell-text-primary'),
}

const activeLabSurface: CSSProperties = {
  background: shellVar('--pg-shell-bg-subtle'),
  border: `1px solid ${shellVar('--pg-shell-border-subtle')}`,
  borderRadius: shellVar('--pg-shell-radius-md'),
  padding: shellVar('--pg-shell-space-md'),
}

export function PlaygroundControls() {
  const currentLab = usePlaygroundStore((s) => s.currentLab)
  const setLab = usePlaygroundStore((s) => s.setLab)
  const [xrMode, setXrMode] = useState(() => xrStore.getState().mode)

  useEffect(() => {
    const t = setInterval(() => setXrMode(xrStore.getState().mode), 250)
    return () => clearInterval(t)
  }, [])

  const inSession = xrMode != null
  const activeLab = labs.find((l) => l.id === currentLab)!
  const supportsVR = activeLab.mode === 'vr' || activeLab.mode === 'cross-xr'
  const supportsAR = activeLab.mode === 'ar' || activeLab.mode === 'cross-xr'
  const vrDisabled = inSession || !supportsVR
  const arDisabled = inSession || !supportsAR

  return (
    <div
      className="pg-playground-controls"
      style={panel}
      role="region"
      aria-labelledby="pg-panel-title"
    >
      <header>
        <h1 id="pg-panel-title" style={panelTitle}>
          WebXR Playground
        </h1>
        <p style={panelSubtitle}>Pick a lab, then enter VR or AR.</p>
      </header>

      <div style={labChipGrid}>
        {labs.map((lab) => (
          <button
            key={lab.id}
            type="button"
            style={currentLab === lab.id ? btnChipActive : btnChip}
            onClick={() => setLab(lab.id)}
            title={`${lab.name} — ${lab.description}`}
          >
            {lab.name}
          </button>
        ))}
      </div>

      <div style={activeLabSurface}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: shellVar('--pg-shell-space-sm'),
          }}
        >
          <div style={tagRow} aria-label="Supported XR modes">
            {modeTags(activeLab.mode).map((t) => (
              <span key={t} style={badge}>
                {t}
              </span>
            ))}
          </div>
          <p style={{ ...metaMuted, margin: 0 }}>{activeLab.description}</p>
        </div>
      </div>

      <div style={sessionRow}>
        <button
          type="button"
          className="pg-session-btn"
          style={vrDisabled ? btnSessionDisabled : btnSessionSecondary}
          disabled={vrDisabled}
          title={
            inSession
              ? undefined
              : !supportsVR
                ? 'This lab supports AR only'
                : undefined
          }
          onClick={() => {
            if (!vrDisabled && xrStore.getState().mode == null) xrStore.enterVR()
          }}
        >
          Enter VR
        </button>
        <button
          type="button"
          className="pg-session-btn"
          style={arDisabled ? btnSessionDisabled : btnSessionPrimary}
          disabled={arDisabled}
          title={
            inSession
              ? undefined
              : !supportsAR
                ? 'This lab supports VR only'
                : undefined
          }
          onClick={() => {
            if (!arDisabled && xrStore.getState().mode == null) xrStore.enterAR()
          }}
        >
          Enter AR
        </button>
      </div>

      {inSession ? (
        <p style={{ ...metaMuted, margin: 0 }} role="status">
          XR session active — session buttons disabled.
        </p>
      ) : null}
    </div>
  )
}
