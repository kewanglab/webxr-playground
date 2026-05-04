import { Line } from '@react-three/drei'
import { AdditiveBlending } from 'three'
import { diamondOutline, useHoloColors } from './holoShared'

/**
 * Placement — Planted seed. A diamond crystal sitting directly above a single point on the
 * horizon line, with a thin gravity tick connecting them. Three decisive elements: object,
 * ground, and the moment of contact.
 */
export function PlacementHolo() {
  const { primary, secondary } = useHoloColors()

  return (
    <group>
      <Line
        points={diamondOutline(0.12, 0.18, [0, 0.08, 0])}
        color={primary}
        lineWidth={5}
        transparent
        opacity={0.96}
      />
      <Line
        points={[
          [-0.3, -0.16, 0],
          [0.3, -0.16, 0],
        ]}
        color={secondary}
        lineWidth={3}
        transparent
        opacity={0.78}
      />
      <mesh position={[0, -0.16, 0]}>
        <circleGeometry args={[0.04, 20]} />
        <meshBasicMaterial
          color={primary}
          transparent
          opacity={0.98}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <Line
        points={[
          [0, -0.1, 0],
          [0, -0.16, 0],
        ]}
        color={primary}
        lineWidth={2.5}
        transparent
        opacity={0.6}
        dashed
        dashSize={0.025}
        gapSize={0.02}
      />
    </group>
  )
}
