import { Line } from '@react-three/drei'
import { AdditiveBlending } from 'three'
import { useHoloColors } from './holoShared'

/**
 * Default holo — twin peaks. Used by labs that haven't picked their own glyph yet.
 * Two overlapping triangular peaks above a horizon line, with a small sun-dot above
 * the rear peak. Reads as an unspecified-but-grounded "place" — a generic landmark
 * inside the arch's half-disc until the lab claims its own mark.
 */
export function MountainHolo() {
  const { primary, secondary } = useHoloColors()

  // Rear (taller) peak.
  const rearPeak: [number, number, number] = [0.05, 0.18, 0]
  const rearLeft: [number, number, number] = [-0.22, -0.16, 0]
  const rearRight: [number, number, number] = [0.32, -0.16, 0]

  // Foreground (shorter, offset-left) peak.
  const frontPeak: [number, number, number] = [-0.13, 0.06, 0]
  const frontLeft: [number, number, number] = [-0.32, -0.16, 0]
  const frontRight: [number, number, number] = [0.06, -0.16, 0]

  return (
    <group>
      {/* Horizon. */}
      <Line
        points={[
          [-0.34, -0.16, 0],
          [0.34, -0.16, 0],
        ]}
        color={secondary}
        lineWidth={3}
        transparent
        opacity={0.7}
      />

      {/* Rear peak — bolder primary stroke. */}
      <Line
        points={[rearLeft, rearPeak, rearRight]}
        color={primary}
        lineWidth={5}
        transparent
        opacity={0.95}
      />

      {/* Front peak — slightly lighter, sits in front of the rear silhouette. */}
      <Line
        points={[frontLeft, frontPeak, frontRight]}
        color={primary}
        lineWidth={4}
        transparent
        opacity={0.78}
      />

      {/* Sun-dot above the rear peak — focal accent. */}
      <mesh position={[0.16, 0.22, 0]}>
        <circleGeometry args={[0.03, 24]} />
        <meshBasicMaterial
          color={primary}
          transparent
          opacity={0.95}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Faint snow-line tick on the rear peak. */}
      <Line
        points={[
          [-0.05, 0.04, 0],
          [0.13, 0.04, 0],
        ]}
        color={secondary}
        lineWidth={2.2}
        transparent
        opacity={0.5}
      />
    </group>
  )
}
