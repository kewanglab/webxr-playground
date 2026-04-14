import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import { useLayoutEffect } from 'react'
import { XRRoot } from '../xr/core/XRRoot'
import { PlaygroundControls } from '../ui/PlaygroundControls'
import { AppearanceSettingsDock } from '../ui/AppearanceSettingsDock'
import { DebugPanel } from '../ui/DebugPanel'
import { TestLoggerPanel } from '../ui/TestLoggerPanel'
import { ShellRightRail } from '../ui/ShellRightRail'
import { getPlaygroundPreset } from '../config/playgroundTheme'
import { applyShellTheme } from './applyShellTheme'
import { PlaygroundThemeProvider } from '../xr/theme/PlaygroundThemeContext'
import { usePlaygroundStore } from './store'

function ThemedCanvas() {
  const themePresetId = usePlaygroundStore((s) => s.themePresetId)

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0 }}
      camera={{ position: [0, 1.6, 4.5], fov: 40, near: 0.1, far: 80 }}
    >
      <PlaygroundThemeProvider presetId={themePresetId}>
        <XRRoot />
      </PlaygroundThemeProvider>
      <Stats />
    </Canvas>
  )
}

export function App() {
  const themePresetId = usePlaygroundStore((s) => s.themePresetId)

  useLayoutEffect(() => {
    applyShellTheme(getPlaygroundPreset(themePresetId).shell)
  }, [themePresetId])

  return (
    <>
      <ThemedCanvas />
      <PlaygroundControls />
      <AppearanceSettingsDock />
      <ShellRightRail>
        <DebugPanel />
        <TestLoggerPanel />
      </ShellRightRail>
    </>
  )
}
