import { AdditiveBlending } from 'three'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

type Vec3 = [number, number, number]

/**
 * Shared arch per design-handoff v0.2 Section 04 — frames the action across all VR labs.
 * 2.4 m wide × 1.6 m tall, base at y=0. Theme switch:
 *  - Cloud Park: warm stone (`#FFF5DA`) + amber rim (`#FFD166`), no shadow bloom — flat daytime feel.
 *  - Warm Night: dark stone (`#62504A`) + ember rim (`#C85F58`), higher emissive intensity to fake
 *    the spec's shadow-blur glow (true bloom would need a post-process pass — Phase 8).
 *
 * Geometry: half-torus (major radius 1.2 m) sitting on two box legs (0.4 m tall). The half-torus
 * crown reaches y=1.6 m from the floor.
 */
export function SharedArch({ position = [0, 0, 0] as Vec3 }: { position?: Vec3 }) {
  const preset = usePlaygroundTheme()
  const isCP = preset.id === 'cloud-park'
  const stone = isCP ? '#FFF5DA' : '#62504A'
  const rim = isCP ? '#FFD166' : '#C85F58'
  const rimGlow = isCP ? 'rgba(255,209,102,.88)' : 'rgba(200,95,88,.8)'

  const torusR = 1.2
  const legH = 1.6 - torusR // 0.4 m legs
  const legThick = 0.12
  const torusThick = 0.08

  return (
    <group position={position}>
      {/* Half-torus crown. */}
      <mesh position={[0, legH, 0]}>
        <torusGeometry args={[torusR, torusThick, 10, 48, Math.PI]} />
        <meshStandardMaterial
          color={stone}
          roughness={0.88}
          emissive={rim}
          emissiveIntensity={isCP ? 0.04 : 0.22}
        />
      </mesh>
      {/* Emissive rim stripe just inside the crown. */}
      <mesh position={[0, legH, 0.02]}>
        <torusGeometry args={[torusR * 0.93, 0.016, 6, 40, Math.PI]} />
        <meshBasicMaterial color={rim} transparent opacity={isCP ? 0.88 : 0.85} depthWrite={false} />
      </mesh>
      {/* WN: additive halo behind the crown to fake the spec's "shadow blur 18". */}
      {!isCP && (
        <mesh position={[0, legH, -0.01]}>
          <torusGeometry args={[torusR * 1.04, 0.11, 8, 40, Math.PI]} />
          <meshBasicMaterial
            color={rimGlow}
            transparent
            opacity={0.32}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}
      {/* Legs. */}
      {[-torusR, torusR].map((x) => (
        <mesh key={x} position={[x, legH * 0.5, 0]}>
          <boxGeometry args={[legThick, legH, legThick]} />
          <meshStandardMaterial
            color={stone}
            roughness={0.92}
            emissive={rim}
            emissiveIntensity={isCP ? 0.03 : 0.15}
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * Shared stage platform per design-handoff v0.2 Section 04 — the "island" at scene origin.
 * Oval footprint 1.6 m (X) × 0.35 m (Z), 4 cm thick. Theme switch:
 *  - Cloud Park: warm gold top + subtle scatter dots (painterly daylight stage).
 *  - Warm Night: dark top + ember rim stripe (ritual-stage feel).
 *
 * Low profile (4 cm) avoids physical/virtual floor mismatch disorientation when the user stands
 * at origin in a standing-scale WebXR session.
 */
export function StagePlatform({ position = [0, 0, 0] as Vec3 }: { position?: Vec3 }) {
  const preset = usePlaygroundTheme()
  const isCP = preset.id === 'cloud-park'

  // Footprint: 1.6 m wide × 0.35 m deep ellipse. Cylinder geometry scaled to form the oval.
  const majorR = 0.8 // along world X
  const minorR = 0.175 // along world Z
  const thickness = 0.04

  const top = isCP ? '#F0DC9E' : '#5E5248'
  const rim = isCP ? '#C9A86C' : 'rgba(200,95,88,.68)'
  const emissive = isCP ? '#FFD166' : '#C85F58'

  return (
    <group position={position}>
      {/* Main platform body — cylinder scaled to ellipse. */}
      <mesh position={[0, thickness / 2, 0]} scale={[majorR / 0.5, 1, minorR / 0.5]}>
        <cylinderGeometry args={[0.5, 0.5, thickness, 48]} />
        <meshStandardMaterial
          color={top}
          roughness={0.84}
          emissive={emissive}
          emissiveIntensity={isCP ? 0.05 : 0.12}
        />
      </mesh>
      {/* Rim stripe on top edge. */}
      <mesh
        position={[0, thickness + 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[majorR / 0.5, minorR / 0.5, 1]}
      >
        <ringGeometry args={[0.48, 0.5, 48]} />
        <meshBasicMaterial color={rim} transparent opacity={isCP ? 0.55 : 0.85} depthWrite={false} />
      </mesh>
      {/* CP: scatter gold dots on the top surface. */}
      {isCP &&
        [
          [-0.45, 0.06],
          [-0.18, -0.08],
          [0.12, 0.04],
          [0.32, -0.05],
          [0.52, 0.02],
        ].map(([x, z], i) => (
          <mesh
            key={i}
            position={[x, thickness + 0.002, z]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <circleGeometry args={[0.012, 12]} />
            <meshBasicMaterial color="#FFD166" transparent opacity={0.8} depthWrite={false} />
          </mesh>
        ))}
      {/* WN: additive ember underglow to evoke the spec's "shadow blur 10" around the base. */}
      {!isCP && (
        <mesh
          position={[0, 0.001, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[majorR / 0.5, minorR / 0.5, 1]}
        >
          <ringGeometry args={[0.5, 0.72, 48]} />
          <meshBasicMaterial
            color="rgba(200,95,88,.45)"
            transparent
            opacity={0.45}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  )
}
