import { Leva } from 'leva'
import { usePlaygroundStore } from '../app/store'
import { getPlaygroundPreset, levaThemeFromShell } from '../config/playgroundTheme'

export function DebugPanel() {
  const themePresetId = usePlaygroundStore((s) => s.themePresetId)
  const shell = getPlaygroundPreset(themePresetId).shell

  return (
    <Leva
      collapsed={false}
      theme={{
        ...levaThemeFromShell(shell),
      }}
    />
  )
}
