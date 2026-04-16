import type { ReactNode } from 'react'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

type HUDPanelProps = {
  children: ReactNode
}

/** Minimal themed FPS card for the in-headset TagAlong HUD. */
export function HUDPanel({ children }: HUDPanelProps) {
  const { xr } = usePlaygroundTheme()

  return (
    <group>
      <mesh position={[0, 0, -0.008]} renderOrder={-500}>
        <planeGeometry args={[0.28, 0.095]} />
        <meshBasicMaterial
          color={xr.hud.panelFill}
          transparent
          opacity={xr.hud.panelOpacity}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, -0.007]} renderOrder={-499}>
        <planeGeometry args={[0.255, 0.07]} />
        <meshBasicMaterial
          color={xr.hud.textPrimary}
          transparent
          opacity={0.045}
          depthWrite={false}
        />
      </mesh>
      <group>{children}</group>
    </group>
  )
}
