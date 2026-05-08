import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import { Leva } from 'leva'
import { useLayoutEffect } from 'react'
import { XRRoot } from '../xr/core/XRRoot'
import { PlaygroundControls } from '../ui/PlaygroundControls'
import { AppearanceSettingsDock } from '../ui/AppearanceSettingsDock'
import { DebugPanel } from '../ui/DebugPanel'
import { TestLoggerPanel } from '../ui/TestLoggerPanel'
import { ShellRightRail } from '../ui/ShellRightRail'
import { DirectorOverlay } from '../ui/DirectorOverlay'
import { applyShellTheme } from './applyShellTheme'
import { PlaygroundThemeProvider } from '../xr/theme/PlaygroundThemeContext'
import { usePlaygroundStore } from './store'
import {
  readCaptureMode,
  readDirectorPresetId,
  type CaptureMode,
} from './captureOptions'

function ThemedCanvas({
  captureMode,
  directorActive,
}: {
  captureMode: CaptureMode | null
  directorActive: boolean
}) {
  const themePresetId = usePlaygroundStore((s) => s.themePresetId)
  const showStats = !captureMode && !directorActive

  return (
    <Canvas
      style={{ position: 'fixed', inset: 0 }}
      camera={{ position: [0, 1.6, 4.5], fov: 40, near: 0.1, far: 80 }}
      gl={
        captureMode || directorActive
          ? { antialias: true, preserveDrawingBuffer: true }
          : undefined
      }
    >
      <PlaygroundThemeProvider presetId={themePresetId}>
        <XRRoot />
      </PlaygroundThemeProvider>
      {showStats ? <Stats /> : null}
    </Canvas>
  )
}

export function App() {
  const themePresetId = usePlaygroundStore((s) => s.themePresetId)
  const captureMode = readCaptureMode()
  const directorActive = readDirectorPresetId() != null

  useLayoutEffect(() => {
    applyShellTheme(themePresetId)
  }, [themePresetId])

  // The Quest 3 emulator (`@react-three/xr` localhost auto-init via iwer)
  // injects a floating "Enter XR" badge into a body-level shadow DOM host.
  // Director-mode recordings need a clean canvas, so when director mode is
  // active we observe body children and force-hide the iwer host on sight.
  // The observer (rather than a one-shot effect) covers the case where iwer
  // mounts after the React tree, which can happen on first render.
  useLayoutEffect(() => {
    if (!directorActive || typeof document === 'undefined') return
    const isEmulatorHost = (el: Element): el is HTMLElement =>
      el instanceof HTMLDivElement &&
      el.shadowRoot != null &&
      !el.id &&
      !el.className
    const hide = () => {
      for (const el of Array.from(document.body.children)) {
        if (isEmulatorHost(el)) el.style.display = 'none'
      }
    }
    hide()
    const observer = new MutationObserver(hide)
    observer.observe(document.body, { childList: true })
    return () => observer.disconnect()
  }, [directorActive])

  // Director mode renders a clean canvas (no shell, no Leva) plus the caption
  // overlay so screen recordings have nothing to crop. Capture-scene mode
  // keeps its existing behavior independently of the director.
  const hideShell = captureMode === 'scene' || directorActive

  return (
    <>
      <ThemedCanvas captureMode={captureMode} directorActive={directorActive} />
      {hideShell ? null : (
        <>
          <PlaygroundControls />
          <AppearanceSettingsDock />
          <ShellRightRail>
            <DebugPanel />
            <TestLoggerPanel />
          </ShellRightRail>
        </>
      )}
      {hideShell ? <Leva hidden /> : null}
      {directorActive ? <DirectorOverlay /> : null}
    </>
  )
}
