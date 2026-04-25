import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import { Leva } from 'leva'
import { useLayoutEffect } from 'react'
import { XRRoot } from '../xr/core/XRRoot'
import { PlaygroundControls } from '../ui/PlaygroundControls'
import { AppearanceSettingsDock } from '../ui/AppearanceSettingsDock'
import { DebugPanel } from '../ui/DebugPanel'
import { ShellLevaControls } from '../ui/ShellLevaControls'
import { TestLoggerPanel } from '../ui/TestLoggerPanel'
import { ShellRightRail } from '../ui/ShellRightRail'
import { getPlaygroundPreset } from '../config/playgroundTheme'
import { applyShellTheme } from './applyShellTheme'
import { PlaygroundThemeProvider } from '../xr/theme/PlaygroundThemeContext'
import { usePlaygroundStore } from './store'
import { readCaptureMode, type CaptureMode } from './captureOptions'

function ThemedCanvas({ captureMode }: { captureMode: CaptureMode | null }) {
  const themePresetId = usePlaygroundStore((s) => s.themePresetId)

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0 }}
      camera={{ position: [0, 1.6, 4.5], fov: 40, near: 0.1, far: 80 }}
      gl={
        captureMode
          ? { antialias: true, preserveDrawingBuffer: true }
          : undefined
      }
    >
      <PlaygroundThemeProvider presetId={themePresetId}>
        <XRRoot />
      </PlaygroundThemeProvider>
      {captureMode ? null : <Stats />}
    </Canvas>
  )
}

export function App() {
  const themePresetId = usePlaygroundStore((s) => s.themePresetId)
  const captureMode = readCaptureMode()

  useLayoutEffect(() => {
    applyShellTheme(getPlaygroundPreset(themePresetId).shell)
  }, [themePresetId])

  return (
    <>
      <ThemedCanvas captureMode={captureMode} />
      {captureMode === 'scene' ? null : (
        <>
          <PlaygroundControls />
          <AppearanceSettingsDock />
          <ShellLevaControls />
          <ShellRightRail>
            <DebugPanel />
            <TestLoggerPanel />
          </ShellRightRail>
        </>
      )}
      {captureMode === 'scene' ? <Leva hidden /> : null}
    </>
  )
}
