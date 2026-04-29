import type { PlaygroundPresetId } from '../config/playgroundTheme'

/**
 * Switches the active design-token theme by writing `data-pg-theme` on <html>.
 * Token values themselves are declared statically in `src/styles/tokens.css`.
 * Accepts only valid preset IDs — unknown strings are rejected at compile time.
 */
export function applyShellTheme(presetId: PlaygroundPresetId): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.pgTheme = presetId
}
