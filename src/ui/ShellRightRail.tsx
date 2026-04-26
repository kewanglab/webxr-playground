import type { CSSProperties, ReactNode } from 'react'

const v = (name: string) => `var(${name})`

const rail: CSSProperties = {
  position: 'fixed',
  top: v('--pg-shell-space-lg'),
  right: v('--pg-shell-space-lg'),
  bottom: v('--pg-shell-space-lg'),
  width: 'min(420px, calc(100vw - 2 * var(--pg-shell-space-lg)))',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: v('--pg-shell-space-sm'),
  alignItems: 'stretch',
  pointerEvents: 'none',
  overflow: 'visible',
}

type ShellRightRailProps = {
  children: ReactNode
}

/**
 * Stacks Leva (tuning) above the session logger so narrow viewports don’t overlap panels.
 * Children should use `pointer-events: auto` where they need hits.
 */
export function ShellRightRail({ children }: ShellRightRailProps) {
  return <div style={rail}>{children}</div>
}
