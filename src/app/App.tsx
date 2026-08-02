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
import { AgentHarnessBridge } from '../dev/agentHarness'
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
      {/* Agent harness. `import.meta.env.DEV` folds to `false` at build time,
          so this element — and the module behind it — leave the production
          graph entirely. */}
      {import.meta.env.DEV ? <AgentHarnessBridge /> : null}
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

  // The Quest 3 emulator injects a floating "Enter XR" badge into a
  // body-level shadow DOM host. Director-mode recordings need a clean canvas,
  // so when director mode is active we observe body children and force-hide
  // the iwer host on sight.
  //
  // Phase 2 re-evaluated whether the agent harness makes this obsolete. It
  // does not, and it now has two possible owners rather than one:
  //   - `npm run dev`: `@react-three/xr` auto-installs iwer + DevUI on
  //     hostname `localhost`.
  //   - `npm run dev:agent`: `@iwsdk/vite-plugin-dev` installs it instead, and
  //     suppresses the DevUI *only* on its own Playwright-managed page (it
  //     gates on `window.__IWER_MCP_MANAGED`). A human pointed at the same
  //     dev server still gets the badge.
  // Both owners render the same `@iwer/devui` host, so the content-based
  // detection below covers both without change. It stays.
  //
  // Detection is *content-based* — we check the shadow root for the iwer
  // badge's "XR" button text rather than matching on tag/no-id/no-class,
  // which would false-positive any other library that mounts a body-level
  // shadow host. iwer attaches the shadow root and populates its content
  // asynchronously, so a one-shot effect or a single MutationObserver tick
  // can run before the button text is in the DOM — we poll for up to ~2 s
  // and stop on first hide. If detection never matches, a dev-mode warning
  // surfaces the regression so director recordings don't ship with a stray
  // badge in the corner.
  useLayoutEffect(() => {
    if (!directorActive || typeof document === 'undefined') return
    const isEmulatorHost = (el: Element): el is HTMLElement => {
      if (!(el instanceof HTMLDivElement)) return false
      const shadow = el.shadowRoot
      if (shadow == null) return false
      // iwer renders an "Enter XR" affordance — match on the button text
      // rather than styled-components hash class names (which rotate).
      return /\bXR\b/i.test(shadow.textContent ?? '')
    }
    let hidden = false
    const sweep = () => {
      for (const el of Array.from(document.body.children)) {
        if (isEmulatorHost(el)) {
          el.style.display = 'none'
          hidden = true
        }
      }
      return hidden
    }
    sweep()
    // Re-sweep on every body childList change AND on a polling interval —
    // belt-and-suspenders for iwer's async shadow population, which can
    // populate after the host is appended.
    const observer = new MutationObserver(sweep)
    observer.observe(document.body, { childList: true })
    const pollId = window.setInterval(() => {
      if (sweep()) window.clearInterval(pollId)
    }, 100)
    const warnTimer = window.setTimeout(() => {
      window.clearInterval(pollId)
      if (!hidden && import.meta.env.DEV) {
        console.warn(
          '[director] iwer emulator host not found within 2 s — if a Quest "Enter XR" badge is visible, update the detection heuristic in App.tsx.',
        )
      }
    }, 2000)
    return () => {
      observer.disconnect()
      window.clearInterval(pollId)
      window.clearTimeout(warnTimer)
    }
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
