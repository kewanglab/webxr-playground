import { useControls } from 'leva'
import { useEffect } from 'react'
import { usePlaygroundStore } from '../app/store'

/**
 * Always-mounted shell-level Leva controls. Registers a "Display" folder with quick toggles
 * for shell features (currently: in-XR FPS HUD visibility) so they're available from the
 * desktop Leva panel regardless of which lab is active.
 *
 * Mirrors `playgroundStore.fpsHudVisible` so external mutations (e.g. the appearance dock
 * checkbox) flow back into the Leva UI.
 */
export function ShellLevaControls() {
  const fpsHudVisible = usePlaygroundStore((s) => s.fpsHudVisible)
  const setFpsHudVisible = usePlaygroundStore((s) => s.setFpsHudVisible)

  const [, set] = useControls('Display', () => ({
    fpsHud: {
      value: fpsHudVisible,
      label: 'XR FPS HUD',
      onChange: (v: boolean) => setFpsHudVisible(v),
    },
  }))

  // Reflect external store changes back into the Leva control.
  useEffect(() => {
    set({ fpsHud: fpsHudVisible })
  }, [fpsHudVisible, set])

  return null
}
