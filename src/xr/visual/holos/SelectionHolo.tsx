import { Line } from '@react-three/drei'
import { AdditiveBlending } from 'three'
import { HOLO_DOT_OPACITY, HOLO_DOT_R, useHoloColors } from './holoShared'

/**
 * Selection — Caliper jaws. Two opposing chevrons closing inward on a central focal dot,
 * with faint side ticks suggesting the calliper rule. The dot is the measured point.
 * Resonates with the arch's vertical symmetry.
 */
export function SelectionHolo() {
  const { primary, secondary, isCP } = useHoloColors()
  const stroke = isCP ? 4.5 : 5.5

  return (
    <group>
      <Line
        points={[
          [-0.18, 0.22, 0],
          [0, 0.08, 0],
          [0.18, 0.22, 0],
        ]}
        color={primary}
        lineWidth={stroke}
        transparent
        opacity={0.95}
      />
      <Line
        points={[
          [-0.18, -0.22, 0],
          [0, -0.08, 0],
          [0.18, -0.22, 0],
        ]}
        color={primary}
        lineWidth={stroke}
        transparent
        opacity={0.95}
      />
      <Line
        points={[
          [-0.3, 0, 0],
          [-0.16, 0, 0],
        ]}
        color={secondary}
        lineWidth={stroke - 2}
        transparent
        opacity={0.55}
      />
      <Line
        points={[
          [0.16, 0, 0],
          [0.3, 0, 0],
        ]}
        color={secondary}
        lineWidth={stroke - 2}
        transparent
        opacity={0.55}
      />
      <mesh>
        <circleGeometry args={[HOLO_DOT_R + 0.005, 24]} />
        <meshBasicMaterial
          color={primary}
          transparent
          opacity={HOLO_DOT_OPACITY + 0.03}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
