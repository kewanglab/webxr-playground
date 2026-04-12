import type { CSSProperties } from 'react'

const v = (name: string) => `var(${name})`

/** Matches Leva’s title chevron (12×8, down = open, right = closed). */
export function LoggerLevaChevron({ open }: { open: boolean }) {
  return (
    <svg
      width={12}
      height={8}
      viewBox="0 0 12 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{
        display: 'block',
        transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
        transformOrigin: '50% 50%',
        transition: 'transform 350ms ease',
      }}
    >
      <path
        d="M1 2l5 4 5-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Matches Leva’s ~39–40px title bar; full row is one hit target below. */
const TITLE_BAR_H = 48

const chevronCell: CSSProperties = {
  width: TITLE_BAR_H,
  minWidth: TITLE_BAR_H,
  height: TITLE_BAR_H,
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: v('--pg-shell-text-primary'),
  pointerEvents: 'none',
}

const titleBarRowBase: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  height: TITLE_BAR_H,
  minHeight: TITLE_BAR_H,
  background: v('--pg-shell-bg-elevated'),
  fontFamily: v('--pg-shell-font-mono'),
  fontSize: 14,
  color: v('--pg-shell-text-primary'),
}

const titleText: CSSProperties = {
  flex: 1,
  minWidth: 0,
  textAlign: 'left',
  fontWeight: 400,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const railSpacer: CSSProperties = {
  width: TITLE_BAR_H,
  minWidth: TITLE_BAR_H,
  flexShrink: 0,
  pointerEvents: 'none',
}

type LoggerLevaTitleBarProps = {
  open: boolean
  title: string
  onToggle: () => void
  ariaLabel: string
  /** False when this row is the only row (collapsed strip), like Leva’s top bar alone. */
  showBottomBorder?: boolean
}

/**
 * Title row aligned with Leva’s panel header (40px bar, chevron + title + right gutter).
 */
export function LoggerLevaTitleBar({
  open,
  title,
  onToggle,
  ariaLabel,
  showBottomBorder = true,
}: LoggerLevaTitleBarProps) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={ariaLabel}
      onClick={onToggle}
      style={{
        ...titleBarRowBase,
        width: '100%',
        margin: 0,
        padding: 0,
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        borderBottom: showBottomBorder
          ? `1px solid ${v('--pg-shell-border-subtle')}`
          : 'none',
      }}
    >
      <span style={chevronCell} aria-hidden>
        <LoggerLevaChevron open={open} />
      </span>
      <span style={titleText}>{title}</span>
      <span style={railSpacer} aria-hidden />
    </button>
  )
}

export function loggerLevaPanelShell(): CSSProperties {
  return {
    background: v('--pg-shell-bg-elevated'),
    border: `1px solid ${v('--pg-shell-border-subtle')}`,
    borderRadius: v('--pg-shell-radius-lg'),
    boxShadow: `0 4px 24px ${v('--pg-shell-shadow-soft')}`,
    overflow: 'hidden',
  }
}
