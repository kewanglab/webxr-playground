import { Leva } from 'leva'
import { usePlaygroundStore } from '../app/store'
import { getPlaygroundPreset, levaThemeFromShell } from '../config/playgroundTheme'

export function DebugPanel() {
  const themePresetId = usePlaygroundStore((s) => s.themePresetId)
  const shell = getPlaygroundPreset(themePresetId).shell

  return (
    <div
      style={{
        flex: '0 1 auto',
        minHeight: 0,
        // Leva disables its own scroll container when `fill` is set (see
        // StyledWrapper compoundVariants in leva's source), so we scroll
        // here instead and let flex shrink bound our height to the rail.
        overflowY: 'auto',
        overflowX: 'hidden',
        width: '100%',
        pointerEvents: 'auto',
      }}
    >
      <Leva
        fill
        collapsed={false}
        theme={{
          ...levaThemeFromShell(shell),
        }}
      />
    </div>
  )
}
