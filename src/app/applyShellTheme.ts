/**
 * Switches the active design-token theme by writing `data-pg-theme` on <html>.
 * Token values themselves are declared statically in `src/styles/tokens.css`.
 */
export function applyShellTheme(presetId: string): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.pgTheme = presetId
}
