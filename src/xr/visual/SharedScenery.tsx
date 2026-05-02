import type { ReactNode } from 'react'
import { AdditiveBlending } from 'three'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

type Vec3 = [number, number, number]

export const ARCH_R = 1.2
// Pillar shaft height. Doubled from the design source's 0.36 m so the arch reads as
// a doorway you walk through rather than a low gate you stoop under.
export const LEG_H = 0.72
// Visual centroid of the half-disc (not the geometric midpoint at 0.5r) — places
// the holo at the perceived center of the arch's interior space.
export const HOLO_CENTER_Y = LEG_H + ARCH_R * (4 / (3 * Math.PI))
// Uniform scale applied to the entire arch + stage. Anchored at y=0 so the base stays
// on the floor regardless of scale — only the geometry grows upward and outward.
export const GATEWAY_SCALE = 1.5

export function SharedArch({
  position = [0, 0, 0] as Vec3,
  holo,
}: {
  position?: Vec3
  holo?: ReactNode
}) {
  return (
    <group position={position} scale={GATEWAY_SCALE}>
      <PlinthLegs />
      <DoubleRimCrown />
      <WrapHalo />
      {holo && <group position={[0, HOLO_CENTER_Y, 0]}>{holo}</group>}
    </group>
  )
}

function PlinthLegs() {
  const { xr } = usePlaygroundTheme()
  const { stone, rim } = xr.arch

  const legW = 0.22
  const legD = 0.18
  const capW = 0.32
  const capH = 0.04
  const capD = 0.26

  return (
    <>
      {[-ARCH_R, ARCH_R].map((x) => (
        <group key={x}>
          <mesh position={[x, LEG_H * 0.5, 0]}>
            <boxGeometry args={[legW, LEG_H, legD]} />
            <meshStandardMaterial color={stone} roughness={0.92} />
          </mesh>
          <mesh position={[x, LEG_H - capH / 2, 0]}>
            <boxGeometry args={[capW, capH, capD]} />
            <meshStandardMaterial color={stone} roughness={0.84} />
          </mesh>
          <mesh
            position={[x - Math.sign(x) * (legW / 2 + 0.005), LEG_H * 0.5, 0]}
            rotation={[0, (-Math.sign(x) * Math.PI) / 2, 0]}
          >
            <planeGeometry args={[0.04, LEG_H * 0.7]} />
            <meshBasicMaterial color={rim} transparent opacity={0.4} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </>
  )
}

function DoubleRimCrown() {
  const preset = usePlaygroundTheme()
  const isCP = preset.id === 'cloud-park'
  const { stone, rim, rimSoft } = preset.xr.arch

  return (
    <>
      <mesh position={[0, LEG_H, 0]}>
        <torusGeometry args={[ARCH_R, 0.075, 12, 56, Math.PI]} />
        <meshStandardMaterial
          color={stone}
          roughness={0.88}
          emissive={rim}
          emissiveIntensity={isCP ? 0.05 : 0.2}
        />
      </mesh>
      <mesh position={[0, LEG_H, 0.022]}>
        <torusGeometry args={[ARCH_R * 1.06, 0.008, 6, 40, Math.PI]} />
        <meshBasicMaterial color={rimSoft} transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </>
  )
}

function WrapHalo() {
  const { xr } = usePlaygroundTheme()
  const { haloOuter, haloOuterOp, haloOuterTube, haloInner, haloInnerOp, haloInnerTube } =
    xr.arch

  return (
    <>
      <mesh position={[0, LEG_H, -0.012]}>
        <torusGeometry args={[ARCH_R * 1.075, haloOuterTube, 8, 40, Math.PI]} />
        <meshBasicMaterial
          color={haloOuter}
          transparent
          opacity={haloOuterOp}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, LEG_H, -0.012]}>
        <torusGeometry args={[ARCH_R * 0.93, haloInnerTube, 8, 40, Math.PI]} />
        <meshBasicMaterial
          color={haloInner}
          transparent
          opacity={haloInnerOp}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </>
  )
}

/**
 * Gateway stones + threshold rail. Two square anchor pads at x=±1.2 m (under each
 * arch leg) connected by a thin emissive rail with three dot accents.
 */
export function StagePlatform({ position = [0, 0, 0] as Vec3 }: { position?: Vec3 }) {
  const preset = usePlaygroundTheme()
  const isCP = preset.id === 'cloud-park'
  const { stone, rim, rimSoft } = preset.xr.arch

  const legX = 1.2
  const padW = 0.52
  const padD = 0.52
  const padH = 0.025
  const railW = (legX - padW / 2) * 2 - 0.04

  return (
    <group position={position} scale={GATEWAY_SCALE}>
      {[-legX, legX].map((x) => (
        <group key={x}>
          <mesh position={[x, padH / 2, 0]}>
            <boxGeometry args={[padW, padH, padD]} />
            <meshStandardMaterial
              color={stone}
              roughness={0.88}
              emissive={rim}
              emissiveIntensity={isCP ? 0.02 : 0.06}
            />
          </mesh>
          <mesh position={[x, padH + 0.001, padD / 2]}>
            <boxGeometry args={[padW, 0.003, 0.004]} />
            <meshBasicMaterial
              color={rim}
              transparent
              opacity={isCP ? 0.42 : 0.55}
              depthWrite={false}
              blending={AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.002, 0]}>
        <boxGeometry args={[railW, 0.004, 0.018]} />
        <meshBasicMaterial
          color={rim}
          transparent
          opacity={isCP ? 0.5 : 0.65}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      {[-0.28, 0, 0.28].map((x) => (
        <mesh key={x} position={[x, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.018, 20]} />
          <meshBasicMaterial
            color={rimSoft}
            transparent
            opacity={isCP ? 0.35 : 0.45}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  )
}
