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
        overflow: 'visible',
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
