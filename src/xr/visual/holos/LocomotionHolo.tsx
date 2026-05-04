import { Line } from '@react-three/drei'
import { AdditiveBlending } from 'three'
import {
  HOLO_DOT_OPACITY,
  HOLO_RING_OPACITY,
  circularArc,
  fullRing,
  tangentArrowhead,
  useHoloColors,
} from './holoShared'

/**
 * Locomotion — Calligraphic journey. One graceful circular-arc stroke from a small origin
 * ring at lower-left curving up and over to a flag at upper-right. A single confident pen
 * stroke. The tangent-aligned arrowhead at the flag's foot marks the moment of arrival.
 */
export function LocomotionHolo() {
  const { primary, secondary } = useHoloColors()
  const origin: [number, number, number] = [-0.34, -0.2, 0]
  const flagFoot: [number, number, number] = [0.18, 0.04, 0]
  const path = circularArc(origin, flagFoot, 0.12, 'left', 48)
  const last = path[path.length - 1]
  const prev = path[path.length - 2]
  const tangent: [number, number] = [last[0] - prev[0], last[1] - prev[1]]

  return (
    <group>
      <Line
        points={[
          [-0.4, -0.26, 0],
          [-0.16, -0.26, 0],
        ]}
        color={secondary}
        lineWidth={2.4}
        transparent
        opacity={0.5}
      />

      <Line points={path} color={primary} lineWidth={4} transparent opacity={0.92} />

      <Line
        points={tangentArrowhead(flagFoot, tangent, 0.06)}
        color={primary}
        lineWidth={4}
        transparent
        opacity={0.92}
      />

      <OriginRing position={origin} color={primary} />
      <RefinedFlag position={flagFoot} color={secondary} />
    </group>
  )
}

function OriginRing({
  position,
  color,
}: {
  position: [number, number, number]
  color: string
}) {
  return (
    <group position={position}>
      <Line
        points={fullRing(0.038, 22)}
        color={color}
        lineWidth={2.4}
        transparent
        opacity={HOLO_RING_OPACITY - 0.08}
      />
      <mesh>
        <circleGeometry args={[0.02, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

function RefinedFlag({
  position,
  color,
}: {
  position: [number, number, number]
  color: string
}) {
  const poleLen = 0.18

  return (
    <group position={position}>
      <Line
        points={fullRing(0.038, 24)}
        color={color}
        lineWidth={2.5}
        transparent
        opacity={HOLO_RING_OPACITY + 0.1}
      />
      <Line
        points={[
          [0, 0, 0],
          [0, poleLen, 0],
        ]}
        color={color}
        lineWidth={3.5}
        transparent
        opacity={0.95}
      />
      <Line
        points={[
          [0, poleLen, 0],
          [0.13, poleLen - 0.035, 0],
          [0, poleLen - 0.07, 0],
        ]}
        color={color}
        lineWidth={3.5}
        transparent
        opacity={0.95}
      />
      <mesh>
        <circleGeometry args={[0.022, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={HOLO_DOT_OPACITY}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
