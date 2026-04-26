import { AdditiveBlending } from 'three'
import { usePlaygroundStore } from '../../app/store'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

/**
 * Passthrough-first; optional 1 m-class alignment ring (toggle in playground chrome).
 */
export function ARScene() {
  const visible = usePlaygroundStore((s) => s.arAlignmentGuide)
  const { xr } = usePlaygroundTheme()

  if (!visible) return null

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
      <mesh>
        <torusGeometry args={[0.5, 0.0025, 8, 64]} />
        <meshBasicMaterial
          color={xr.ar.stroke}
          transparent
          opacity={xr.ar.opacity}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
