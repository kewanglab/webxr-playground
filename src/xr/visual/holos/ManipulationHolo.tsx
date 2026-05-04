import { Line } from '@react-three/drei'
import { AdditiveBlending } from 'three'
import {
  HOLO_DOT_OPACITY,
  arcSegment,
  diamondOutline,
  tangentArrowhead,
  useHoloColors,
} from './holoShared'

/**
 * Manipulation — Rotation gizmo. A held diamond at center + two curved arrows orbiting it
 * (opposing endpoints, same rotational direction) + cardinal angular ticks. Arrowheads are
 * tangent-aligned to the arc — the chevron opens against the direction of motion at each end.
 */
export function ManipulationHolo() {
  const { primary, secondary } = useHoloColors()
  const R = 0.22

  // Upper arc: from 0.78π to 0.22π (clockwise, sweeping over the top).
  const upperEndAngle = Math.PI * 0.22
  const upperEndPos: [number, number, number] = [
    Math.cos(upperEndAngle) * R,
    Math.sin(upperEndAngle) * R,
    0,
  ]
  const upperTangent: [number, number] = [Math.sin(upperEndAngle), -Math.cos(upperEndAngle)]

  // Lower arc: from -0.22π to -0.78π (clockwise, sweeping under the bottom).
  const lowerEndAngle = -Math.PI * 0.78
  const lowerEndPos: [number, number, number] = [
    Math.cos(lowerEndAngle) * R,
    Math.sin(lowerEndAngle) * R,
    0,
  ]
  const lowerTangent: [number, number] = [Math.sin(lowerEndAngle), -Math.cos(lowerEndAngle)]

  return (
    <group>
      <Line
        points={diamondOutline(0.1, 0.1)}
        color={secondary}
        lineWidth={4.5}
        transparent
        opacity={0.95}
      />

      <Line
        points={arcSegment(R, Math.PI * 0.78, upperEndAngle, 28)}
        color={primary}
        lineWidth={4}
        transparent
        opacity={0.92}
      />
      <Line
        points={tangentArrowhead(upperEndPos, upperTangent, 0.07)}
        color={primary}
        lineWidth={4}
        transparent
        opacity={0.92}
      />

      <Line
        points={arcSegment(R, -Math.PI * 0.22, lowerEndAngle, 28)}
        color={primary}
        lineWidth={4}
        transparent
        opacity={0.92}
      />
      <Line
        points={tangentArrowhead(lowerEndPos, lowerTangent, 0.07)}
        color={primary}
        lineWidth={4}
        transparent
        opacity={0.92}
      />

      {[0, 0.5, 1, 1.5].map((k) => {
        const a = k * Math.PI
        const inner = 0.27
        const outer = 0.32
        return (
          <Line
            key={k}
            points={[
              [Math.cos(a) * inner, Math.sin(a) * inner, 0],
              [Math.cos(a) * outer, Math.sin(a) * outer, 0],
            ]}
            color={secondary}
            lineWidth={2}
            transparent
            opacity={0.55}
          />
        )
      })}

      <mesh>
        <circleGeometry args={[0.022, 16]} />
        <meshBasicMaterial
          color={primary}
          transparent
          opacity={HOLO_DOT_OPACITY}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
