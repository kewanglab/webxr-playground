import { DoubleSide } from 'three'
import type { ReactNode } from 'react'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

type HUDPanelProps = {
  children: ReactNode
}

/**
 * Translucent plate + ring “seal” behind TagAlong HUD content (xr.hud tokens).
 */
export function HUDPanel({ children }: HUDPanelProps) {
  const { xr } = usePlaygroundTheme()

  return (
    <group>
      <mesh position={[0, 0, -0.008]} renderOrder={-500}>
        <planeGeometry args={[0.52, 0.28]} />
        <meshBasicMaterial
          color={xr.hud.panelFill}
          transparent
          opacity={xr.hud.panelOpacity}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, -0.006]} renderOrder={-499}>
        <ringGeometry args={[0.22, 0.248, 40]} />
        <meshBasicMaterial
          color={xr.hud.panelBorder}
          transparent
          opacity={0.92}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <group>{children}</group>
    </group>
  )
}
