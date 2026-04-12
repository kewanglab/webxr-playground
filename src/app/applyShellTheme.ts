import type { ShellTheme } from '../config/playgroundTheme'

/**
 * Writes shell tokens to `document.documentElement` as `--pg-shell-*` CSS variables.
 */
export function applyShellTheme(shell: ShellTheme): void {
  if (typeof document === 'undefined') return
  const r = document.documentElement.style

  r.setProperty('--pg-shell-bg-canvas', shell.bg.canvas)
  r.setProperty('--pg-shell-bg-elevated', shell.bg.elevated)
  r.setProperty('--pg-shell-bg-subtle', shell.bg.subtle)
  r.setProperty('--pg-shell-border-subtle', shell.border.subtle)
  r.setProperty('--pg-shell-border-default', shell.border.default)
  r.setProperty('--pg-shell-text-primary', shell.text.primary)
  r.setProperty('--pg-shell-text-muted', shell.text.muted)
  r.setProperty('--pg-shell-text-inverse', shell.text.inverse)
  r.setProperty('--pg-shell-accent-primary', shell.accent.primary)
  r.setProperty('--pg-shell-accent-primary-hover', shell.accent.primaryHover)
  r.setProperty('--pg-shell-accent-soft', shell.accent.soft)
  r.setProperty('--pg-shell-focus-ring', shell.focus.ring)
  r.setProperty('--pg-shell-state-success', shell.state.success)
  r.setProperty('--pg-shell-state-warning', shell.state.warning)
  r.setProperty('--pg-shell-state-danger', shell.state.danger)
  r.setProperty('--pg-shell-shadow-soft', shell.shadow.soft)
  r.setProperty('--pg-shell-overlay-scrim', shell.overlay.scrim)
  r.setProperty('--pg-shell-font-ui', shell.font.ui)
  r.setProperty('--pg-shell-font-mono', shell.font.mono)

  const { space } = shell
  r.setProperty('--pg-shell-space-micro', `${space.micro}px`)
  r.setProperty('--pg-shell-space-xs', `${space.xs}px`)
  r.setProperty('--pg-shell-space-sm', `${space.sm}px`)
  r.setProperty('--pg-shell-space-md', `${space.md}px`)
  r.setProperty('--pg-shell-space-lg', `${space.lg}px`)
  r.setProperty('--pg-shell-space-xl', `${space.xl}px`)
  r.setProperty('--pg-shell-space-xxl', `${space.xxl}px`)

  r.setProperty('--pg-shell-radius-sm', `${shell.radius.sm}px`)
  r.setProperty('--pg-shell-radius-md', `${shell.radius.md}px`)
  r.setProperty('--pg-shell-radius-lg', `${shell.radius.lg}px`)

  r.setProperty('font-family', shell.font.ui)
}
