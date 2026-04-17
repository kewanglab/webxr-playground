import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  ClampToEdgeWrapping,
  DataTexture,
  DoubleSide,
  LinearFilter,
  RGBAFormat,
  UnsignedByteType,
  type Group,
  type Texture,
} from 'three'
import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

type Vec3 = [number, number, number]

type CloudPuff = {
  position: Vec3
  scale: Vec3
  color?: string
}

type CloudCardLayer = {
  position: Vec3
  scale: Vec3
  rotation?: Vec3
  color: string
  opacity: number
  role?: 'body' | 'highlight' | 'shadow'
}

const atmosphericClouds: Array<{
  position: Vec3
  scale: Vec3
  phase: number
  speed: number
  layers: CloudCardLayer[]
}> = [
  {
    position: [-8.4, 2.95, -18],
    scale: [1.28, 1, 1],
    phase: 0.4,
    speed: 0.08,
    layers: [
      { position: [-0.74, -0.03, 0], scale: [0.92, 0.26, 1], color: '#FFF7DE', opacity: 0.52 },
      { position: [-0.14, 0.1, 0.01], scale: [1.1, 0.38, 1], color: '#FFFDF0', opacity: 0.68, role: 'highlight' },
      { position: [0.66, -0.01, 0.02], scale: [0.84, 0.28, 1], color: '#E0F6EA', opacity: 0.42 },
      { position: [0.08, -0.16, 0.03], scale: [1.86, 0.2, 1], color: '#E9D7AC', opacity: 0.3, role: 'shadow' },
    ],
  },
  {
    position: [7.7, 3.75, -25],
    scale: [1.62, 1, 1],
    phase: 1.8,
    speed: 0.06,
    layers: [
      { position: [-0.82, -0.05, 0], scale: [0.96, 0.24, 1], color: '#F9F4DA', opacity: 0.42 },
      { position: [-0.16, 0.14, 0.01], scale: [1.12, 0.4, 1], color: '#FFFBEA', opacity: 0.6, role: 'highlight' },
      { position: [0.72, 0.01, 0.02], scale: [0.88, 0.28, 1], color: '#DDF5E6', opacity: 0.38 },
      { position: [0.02, -0.2, 0.03], scale: [2.12, 0.2, 1], color: '#DECDA7', opacity: 0.28, role: 'shadow' },
    ],
  },
  {
    position: [-2.7, 5.05, -36],
    scale: [2.2, 1, 1],
    phase: 3.2,
    speed: 0.045,
    layers: [
      { position: [-0.98, -0.07, 0], scale: [1.04, 0.23, 1], color: '#F4F0D6', opacity: 0.34 },
      { position: [-0.22, 0.17, 0.01], scale: [0.96, 0.42, 1], color: '#FFF8E2', opacity: 0.48, role: 'highlight' },
      { position: [0.52, 0.06, 0.02], scale: [1.18, 0.34, 1], color: '#FFFBEA', opacity: 0.46 },
      { position: [1.2, -0.1, 0.03], scale: [0.74, 0.22, 1], color: '#D8F1E2', opacity: 0.28 },
      { position: [0.14, -0.24, 0.04], scale: [2.46, 0.18, 1], color: '#D8C39C', opacity: 0.24, role: 'shadow' },
    ],
  },
  {
    position: [0.9, 2.15, -14.2],
    scale: [0.82, 0.78, 1],
    phase: 2.5,
    speed: 0.09,
    layers: [
      { position: [-0.46, -0.03, 0], scale: [0.66, 0.18, 1], color: '#FFFDF0', opacity: 0.42, role: 'highlight' },
      { position: [0.14, 0.06, 0.01], scale: [0.82, 0.24, 1], color: '#FFF4CE', opacity: 0.34 },
      { position: [0.64, -0.04, 0.02], scale: [0.5, 0.14, 1], color: '#E4F7EB', opacity: 0.3 },
      { position: [0.08, -0.13, 0.03], scale: [1.28, 0.11, 1], color: '#D9C8A4', opacity: 0.2, role: 'shadow' },
    ],
  },
]

const distantStructures: Array<{
  position: Vec3
  scale: number
  opacity: number
}> = [
  { position: [-6.4, 1.2, -29], scale: 0.72, opacity: 0.1 },
  { position: [5.6, 1.05, -33], scale: 0.62, opacity: 0.08 },
  { position: [0.8, 1.36, -41], scale: 0.9, opacity: 0.065 },
]

const windStreaks: Array<{
  position: Vec3
  rotation: Vec3
  scale: Vec3
  opacity: number
  phase: number
}> = [
  { position: [-5.8, 3.8, -13.5], rotation: [0, 0, -0.16], scale: [2.7, 1, 1], opacity: 0.28, phase: 0.2 },
  { position: [4.9, 4.75, -18], rotation: [0, 0, 0.11], scale: [3.2, 1, 1], opacity: 0.22, phase: 1.1 },
  { position: [-1.2, 2.6, -11.5], rotation: [0, 0, 0.08], scale: [1.6, 1, 1], opacity: 0.18, phase: 2.4 },
  { position: [7.5, 2.15, -15.5], rotation: [0, 0, -0.08], scale: [1.9, 1, 1], opacity: 0.2, phase: 3.1 },
]

const airFlecks: Vec3[] = [
  [-3.6, 2.5, -8.6],
  [-1.9, 3.2, -12.4],
  [0.8, 2.85, -9.8],
  [2.6, 3.75, -15.8],
  [5.4, 2.55, -11.2],
  [-6.1, 4.25, -18.5],
  [6.4, 4.65, -22.6],
  [-0.5, 5.15, -27.5],
  [3.2, 5.7, -31.5],
  [-4.8, 3.55, -20.2],
]

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function createSoftAlphaTexture(kind: 'cloud' | 'sunGlow' | 'sunCore') {
  const size = kind === 'cloud' ? 96 : 128
  const data = new Uint8Array(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / (size - 1)) * 2 - 1
      const v = (y / (size - 1)) * 2 - 1
      const i = (y * size + x) * 4

      let alpha = 0
      if (kind === 'cloud') {
        const wobble =
          Math.sin(u * 5.2) * 0.045 +
          Math.cos((u + v) * 4.1) * 0.035 +
          Math.sin(v * 7.4) * 0.018
        const d = Math.sqrt((u * 0.92) ** 2 + ((v + 0.03) * 1.42) ** 2)
        const body = 1 - smoothstep(0.46 + wobble, 1.02 + wobble, d)
        const centerLift = 1 - smoothstep(0.06, 0.58, d)
        alpha = Math.min(1, Math.max(0, body * 0.86 + centerLift * 0.14))
      } else {
        const d = Math.sqrt(u * u + v * v)
        const core = kind === 'sunCore'
          ? 1 - smoothstep(0.05, 0.72, d)
          : 1 - smoothstep(0.02, 1, d)
        const falloff = Math.pow(Math.max(0, core), kind === 'sunCore' ? 1.25 : 2.6)
        alpha = Math.min(1, Math.max(0, falloff))
      }

      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = Math.round(alpha * 255)
    }
  }

  const texture = new DataTexture(data, size, size, RGBAFormat, UnsignedByteType)
  texture.needsUpdate = true
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping
  return texture
}

function useSoftAlphaTexture(kind: 'cloud' | 'sunGlow' | 'sunCore') {
  const texture = useMemo(() => createSoftAlphaTexture(kind), [kind])

  useEffect(() => {
    return () => texture.dispose()
  }, [texture])

  return texture
}

function DriftGroup({
  position,
  amplitude = [0.02, 0.01, 0],
  speed = 0.08,
  phase = 0,
  children,
}: {
  position: Vec3
  amplitude?: Vec3
  speed?: number
  phase?: number
  children: ReactNode
}) {
  const ref = useRef<Group>(null)

  useFrame(({ clock }) => {
    const group = ref.current
    if (!group) return
    const t = clock.elapsedTime * speed + phase
    group.position.x = position[0] + Math.sin(t) * amplitude[0]
    group.position.y = position[1] + Math.cos(t * 0.72) * amplitude[1]
    group.position.z = position[2] + Math.sin(t * 0.43) * amplitude[2]
  })

  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  )
}

function PainterlyCloud({
  layers,
  position,
  scale = [1, 1, 1],
  phase,
  speed,
}: {
  layers: CloudCardLayer[]
  position: Vec3
  scale?: Vec3
  phase: number
  speed: number
}) {
  const cloudTexture = useSoftAlphaTexture('cloud')

  return (
    <DriftGroup position={position} phase={phase} speed={speed} amplitude={[0.08, 0.018, 0]}>
      <group scale={scale}>
        {layers.map((layer, i) => (
          <mesh
            key={`cloud-card-${i}`}
            position={layer.position}
            rotation={layer.rotation ?? [0, 0, i % 2 === 0 ? -0.02 : 0.025]}
            scale={layer.scale}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={cloudTexture}
              color={layer.color}
              transparent
              opacity={layer.opacity}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </DriftGroup>
  )
}

function CloudCluster({
  puffs,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  baseColor,
  opacity = 0.86,
}: {
  puffs: CloudPuff[]
  position?: Vec3
  scale?: Vec3
  baseColor: string
  shadeColor: string
  opacity?: number
}) {
  return (
    <group position={position} scale={scale}>
      {puffs.map((puff, i) => (
        <mesh key={`${puff.position.join('-')}-${i}`} position={puff.position} scale={puff.scale}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial
            color={puff.color ?? baseColor}
            transparent
            opacity={opacity}
          />
        </mesh>
      ))}
    </group>
  )
}

function AtmosphericSun() {
  const glowTexture = useSoftAlphaTexture('sunGlow')
  const coreTexture = useSoftAlphaTexture('sunCore')
  const cloudTexture = useSoftAlphaTexture('cloud')

  return (
    <group position={[8.6, 5.85, -42]}>
      <mesh scale={[12.2, 12.2, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glowTexture}
          color="#FFE4A5"
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0.08, -0.05, 0.01]} scale={[6.6, 6.6, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={glowTexture}
          color="#FFECC2"
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0.14, -0.02, 0.02]} scale={[2.1, 2.1, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={coreTexture}
          color="#FFF4D2"
          transparent
          opacity={0.34}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0.18, 0, 0.03]} scale={[0.74, 0.74, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={coreTexture}
          color="#FFFDF0"
          transparent
          opacity={0.78}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
      <group position={[0.64, -0.48, 0.06]}>
        {[
          [-0.76, -0.02, 0, 1.55, 0.28, '#FFEFC5', 0.32],
          [0, 0.08, 0.01, 1.86, 0.38, '#FFF9E4', 0.38],
          [0.86, -0.04, 0.02, 1.36, 0.26, '#E8F5DE', 0.24],
          [0.1, -0.19, 0.03, 2.82, 0.18, '#DCC59B', 0.16],
        ].map(([x, y, z, sx, sy, color, opacity], i) => (
          <mesh
            key={`sun-veil-cloud-${i}`}
            position={[x as number, y as number, z as number]}
            scale={[sx as number, sy as number, 1]}
            rotation={[0, 0, i % 2 === 0 ? 0.015 : -0.02]}
          >
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
              map={cloudTexture}
              color={color as string}
              transparent
              opacity={opacity as number}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

function DistantArchSilhouette({
  position,
  scale,
  opacity,
}: {
  position: Vec3
  scale: number
  opacity: number
}) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.52, 0]}>
        <torusGeometry args={[0.82, 0.035, 8, 36, Math.PI * 1.08]} />
        <meshBasicMaterial color="#FFF7D7" transparent opacity={opacity} depthWrite={false} side={DoubleSide} />
      </mesh>
      {[-0.72, 0.72].map((x) => (
        <mesh key={`distant-arch-leg-${x}`} position={[x, 0.12, 0]}>
          <capsuleGeometry args={[0.035, 0.52, 6, 10]} />
          <meshBasicMaterial color="#FFF7D7" transparent opacity={opacity * 0.72} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export function CloudParkWorld() {
  const preset = usePlaygroundTheme()
  if (preset.id !== 'cloud-park') return null

  const { xr } = preset

  return (
    <group>
      <mesh position={[0, 1.22, -46]}>
        <planeGeometry args={[96, 10.5]} />
        <meshBasicMaterial
          color="#FFE4AC"
          transparent
          opacity={0.2}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.44, -36]} rotation={[-0.04, 0, 0]}>
        <planeGeometry args={[80, 3.2]} />
        <meshBasicMaterial
          color="#79BFD1"
          transparent
          opacity={0.13}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, 2.5, -48]}>
        <planeGeometry args={[92, 18]} />
        <meshBasicMaterial
          color="#AEE6E0"
          transparent
          opacity={0.045}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
      <AtmosphericSun />
      {atmosphericClouds.map((cloudSet, i) => (
        <PainterlyCloud
          key={`atmospheric-cloud-${i}`}
          position={cloudSet.position}
          scale={cloudSet.scale}
          layers={cloudSet.layers}
          phase={cloudSet.phase}
          speed={cloudSet.speed}
        />
      ))}
      {distantStructures.map((structure, i) => (
        <DriftGroup
          key={`cloud-park-distant-arch-${i}`}
          position={structure.position}
          amplitude={[0.03, 0.008, 0]}
          speed={0.04 + i * 0.01}
          phase={i * 1.2}
        >
          <DistantArchSilhouette
            position={[0, 0, 0]}
            scale={structure.scale}
            opacity={structure.opacity}
          />
        </DriftGroup>
      ))}
      {windStreaks.map((streak, i) => (
        <DriftGroup
          key={`wind-streak-${i}`}
          position={streak.position}
          amplitude={[0.12, 0.015, 0]}
          speed={0.1}
          phase={streak.phase}
        >
          <mesh
            rotation={streak.rotation}
            scale={streak.scale}
          >
            <planeGeometry args={[1, 0.018]} />
            <meshBasicMaterial
              color="#FFF3D1"
              transparent
              opacity={streak.opacity}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        </DriftGroup>
      ))}
      {airFlecks.map((position, i) => (
        <DriftGroup
          key={`air-fleck-${i}`}
          position={position}
          amplitude={[0.025, 0.012, 0]}
          speed={0.12}
          phase={i * 0.6}
        >
          <mesh>
            <circleGeometry args={[i % 3 === 0 ? 0.022 : 0.014, 8]} />
            <meshBasicMaterial color="#FFF9E8" transparent opacity={0.58} depthWrite={false} />
          </mesh>
        </DriftGroup>
      ))}
      <CloudParkShadowBlob position={[0, 0.012, -2.2]} scale={[5.7, 1, 2.3]} color={xr.accent.cyan} opacity={0.045} />
      <CloudParkShadowBlob position={[-4.8, 0.014, -7.5]} scale={[3.6, 1, 1.5]} color={xr.accent.stone} opacity={0.075} />
      <CloudParkShadowBlob position={[5.2, 0.014, -8.8]} scale={[3.9, 1, 1.6]} color={xr.accent.stone} opacity={0.07} />
    </group>
  )
}

export function CloudParkShadowBlob({
  position,
  scale = [1, 1, 1],
  color = '#1E6F7A',
  opacity = 0.16,
}: {
  position: Vec3
  scale?: Vec3
  color?: string
  opacity?: number
}) {
  return (
    <mesh position={position} scale={scale} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.5, 32]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

export function FloatingCloudMat({
  position,
  scale = 1,
  cloudColor = '#FFF5DA',
  shadeColor = '#DCF3E5',
  rimColor = '#FFD166',
}: {
  position: Vec3
  scale?: number
  cloudColor?: string
  shadeColor?: string
  rimColor?: string
}) {
  const puffs: CloudPuff[] = [
    { position: [-0.52, 0.03, 0.03], scale: [0.72, 0.1, 0.48] },
    { position: [0, 0.045, -0.02], scale: [0.9, 0.12, 0.58] },
    { position: [0.55, 0.035, 0.04], scale: [0.68, 0.1, 0.45] },
    { position: [-0.08, 0.05, 0.32], scale: [0.64, 0.09, 0.3], color: shadeColor },
    { position: [0.14, 0.052, -0.35], scale: [0.62, 0.08, 0.26], color: shadeColor },
  ]

  return (
    <group position={position} scale={scale}>
      <CloudParkShadowBlob position={[0, 0.005, 0]} scale={[2.2, 1, 1.25]} opacity={0.1} />
      <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.6, 0.78, 42]} />
        <meshBasicMaterial color={rimColor} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <CloudCluster
        puffs={puffs}
        baseColor={cloudColor}
        shadeColor={shadeColor}
        opacity={0.96}
      />
    </group>
  )
}

export function CloudParkPerch({
  position,
  scale = 1,
  bodyColor = '#FFF3C8',
  rimColor = '#FFD166',
  accentColor = '#2FAFC6',
}: {
  position: Vec3
  scale?: number
  bodyColor?: string
  rimColor?: string
  accentColor?: string
}) {
  return (
    <group position={position} scale={scale}>
      <FloatingCloudMat
        position={[0, -0.03, 0]}
        scale={0.62}
        cloudColor={bodyColor}
        shadeColor="#DDF4E3"
        rimColor={rimColor}
      />
      <mesh position={[0, 0.075, 0]} scale={[1.1, 0.34, 0.86]}>
        <cylinderGeometry args={[0.28, 0.34, 0.16, 32]} />
        <meshStandardMaterial color={bodyColor} roughness={0.82} emissive={accentColor} emissiveIntensity={0.025} />
      </mesh>
      <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.21, 0.29, 36]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.28} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function CloudParkBeaconObject({
  objectSize,
  baseColor,
  accentColor,
  restAccent,
  active = false,
  transparent = false,
  opacity = 1,
  depthWrite = true,
}: {
  objectSize: number
  baseColor: string
  accentColor: string
  restAccent: string
  active?: boolean
  transparent?: boolean
  opacity?: number
  depthWrite?: boolean
}) {
  const accent = active ? accentColor : restAccent
  const common = { transparent, opacity, depthWrite }

  return (
    <group>
      <mesh position={[0, objectSize * 0.04, 0]} castShadow>
        <capsuleGeometry args={[objectSize * 0.16, objectSize * 0.32, 8, 18]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.78}
          metalness={0}
          emissive={accent}
          emissiveIntensity={active ? 0.08 : 0.025}
          {...common}
        />
      </mesh>
      <mesh position={[0, objectSize * 0.31, 0]} castShadow scale={[1, 0.78, 1]}>
        <sphereGeometry args={[objectSize * 0.19, 20, 16]} />
        <meshStandardMaterial
          color={accent}
          roughness={0.54}
          metalness={0}
          emissive={accent}
          emissiveIntensity={active ? 0.18 : 0.1}
          {...common}
        />
      </mesh>
      <mesh position={[0, -objectSize * 0.18, 0]} castShadow scale={[1.28, 0.44, 1.12]}>
        <sphereGeometry args={[objectSize * 0.2, 18, 12]} />
        <meshStandardMaterial color={baseColor} roughness={0.84} metalness={0} {...common} />
      </mesh>
      <mesh position={[0, objectSize * 0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[objectSize * 0.29, objectSize * 0.018, 8, 36]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={(active ? 0.64 : 0.42) * opacity}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, objectSize * 0.46, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[objectSize * 0.12, objectSize * 0.012, 8, 28]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={(active ? 0.62 : 0.44) * opacity}
          depthWrite={false}
        />
      </mesh>
      {[-1, 1].map((dir) => (
        <mesh
          key={`beacon-streamer-${dir}`}
          position={[dir * objectSize * 0.18, objectSize * 0.02, objectSize * 0.08]}
          rotation={[0.08, 0, dir * 0.42]}
          castShadow
        >
          <coneGeometry args={[objectSize * 0.055, objectSize * 0.24, 3]} />
          <meshStandardMaterial
            color={dir < 0 ? accentColor : restAccent}
            roughness={0.68}
            metalness={0}
            emissive={accent}
            emissiveIntensity={active ? 0.08 : 0.035}
            {...common}
          />
        </mesh>
      ))}
    </group>
  )
}

export function CloudParkRouteMarker({
  position,
  stone,
  glow,
}: {
  position: Vec3
  stone: string
  glow: string
}) {
  return (
    <group position={position}>
      <CloudParkWindLine position={[-0.34, 0.045, 0]} rotation={[-Math.PI / 2, 0, -0.55]} length={0.96} color={glow} opacity={0.44} />
      <CloudParkWindLine position={[0.34, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0.55]} length={0.96} color={glow} opacity={0.44} />
      <mesh position={[0, 0.052, -0.05]} rotation={[Math.PI / 2, 0, Math.PI]}>
        <coneGeometry args={[0.12, 0.26, 3]} />
        <meshBasicMaterial color={glow} transparent opacity={0.5} depthWrite={false} />
      </mesh>
      {[-0.24, 0, 0.24].map((x, i) => (
        <mesh key={`route-cloud-step-${i}`} position={[x, 0.035, 0.18 - i * 0.05]} scale={[1.28, 0.34, 0.78]}>
          <sphereGeometry args={[0.075, 10, 6]} />
          <meshBasicMaterial color={stone} transparent opacity={0.62 - i * 0.08} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

export function CloudParkWorkbenchHandle({
  active,
  stone,
  primary,
  secondary,
}: {
  active: boolean
  stone: string
  primary: string
  secondary: string
}) {
  const accent = active ? primary : secondary

  return (
    <group>
      <mesh position={[0, -0.105, 0]}>
        <capsuleGeometry args={[0.018, 0.1, 7, 12]} />
        <meshStandardMaterial color={stone} roughness={0.82} emissive={secondary} emissiveIntensity={0.04} />
      </mesh>
      <mesh position={[0, 0.025, 0]} scale={[1.16, 0.82, 1.16]}>
        <sphereGeometry args={[0.058, 18, 14]} />
        <meshStandardMaterial
          color={active ? primary : '#FFF3D4'}
          roughness={0.5}
          metalness={0}
          emissive={accent}
          emissiveIntensity={active ? 0.2 : 0.08}
        />
      </mesh>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.082, 0.006, 6, 28]} />
        <meshBasicMaterial color={primary} transparent opacity={active ? 0.58 : 0.32} depthWrite={false} />
      </mesh>
      <CloudParkWindLine position={[0.05, 0.09, 0.02]} rotation={[0, 0, -0.22]} length={0.16} color={secondary} opacity={0.34} />
    </group>
  )
}

export function CloudParkGardenTray({
  position,
  trayColor,
  rimColor,
  sandColor,
  sandMap,
}: {
  position: Vec3
  trayColor: string
  rimColor: string
  sandColor: string
  sandMap?: Texture
}) {
  return (
    <group position={position}>
      <mesh receiveShadow castShadow scale={[1.12, 1, 0.78]}>
        <cylinderGeometry args={[0.36, 0.42, 0.044, 40]} />
        <meshStandardMaterial color={trayColor} roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.028, 0]} receiveShadow scale={[1.08, 1, 0.74]}>
        <cylinderGeometry args={[0.32, 0.32, 0.009, 40]} />
        <meshStandardMaterial map={sandMap} color={sandColor} roughness={1} />
      </mesh>
      <mesh position={[0, 0.052, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.08, 0.74, 1]}>
        <torusGeometry args={[0.34, 0.018, 8, 44]} />
        <meshStandardMaterial color={rimColor} roughness={0.78} />
      </mesh>
      <mesh position={[0, 0.058, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.94, 0.62, 1]}>
        <ringGeometry args={[0.18, 0.23, 36]} />
        <meshBasicMaterial color="#FFF7D8" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function CloudParkArch({
  position,
  scale = 1,
  stone,
  rim,
}: {
  position: Vec3
  scale?: number
  stone: string
  rim: string
}) {
  const legX = 1.08

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.58, 0]}>
        <torusGeometry args={[1.1, 0.08, 10, 44, Math.PI]} />
        <meshStandardMaterial
          color={stone}
          roughness={0.86}
          emissive={rim}
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh position={[0, 0.58, 0.018]}>
        <torusGeometry args={[0.9, 0.018, 8, 38, Math.PI]} />
        <meshBasicMaterial color={rim} transparent opacity={0.62} depthWrite={false} />
      </mesh>
      {[-legX, legX].map((x) => (
        <group key={`cloud-arch-leg-${x}`} position={[x, -0.03, 0]}>
          <mesh position={[0, 0.23, 0]}>
            <capsuleGeometry args={[0.075, 0.74, 7, 12]} />
            <meshStandardMaterial color={stone} roughness={0.92} emissive={rim} emissiveIntensity={0.035} />
          </mesh>
          <mesh position={[0, 0.61, 0]}>
            <sphereGeometry args={[0.13, 14, 10]} />
            <meshStandardMaterial color={stone} roughness={0.84} emissive={rim} emissiveIntensity={0.05} />
          </mesh>
          <mesh position={[0, 0.61, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.105, 0.01, 6, 22]} />
            <meshBasicMaterial color={rim} transparent opacity={0.36} depthWrite={false} />
          </mesh>
          <FloatingCloudMat position={[0, -0.18, 0.02]} scale={0.38} cloudColor={stone} rimColor={rim} />
        </group>
      ))}
      <CloudCluster
        position={[0.16, 1.12, 0.03]}
        scale={[0.72, 0.72, 0.72]}
        baseColor="#FFF5DA"
        shadeColor="#DCF3E5"
        opacity={0.92}
        puffs={[
          { position: [-0.42, 0, 0], scale: [0.38, 0.18, 0.12] },
          { position: [0, 0.08, 0], scale: [0.52, 0.26, 0.16] },
          { position: [0.44, -0.02, 0], scale: [0.34, 0.16, 0.12] },
        ]}
      />
    </group>
  )
}

export function CloudParkSideIsland({
  position,
  scale = 1,
  rimColor,
}: {
  position: Vec3
  scale?: number
  rimColor: string
}) {
  return (
    <group position={position} scale={scale}>
      <FloatingCloudMat position={[0, 0, 0]} scale={0.74} rimColor={rimColor} />
      <mesh position={[0, 0.16, 0]} rotation={[0, 0, 0.18]}>
        <coneGeometry args={[0.18, 0.44, 5]} />
        <meshStandardMaterial color="#BFEAD5" roughness={0.88} />
      </mesh>
      <mesh position={[0.3, 0.12, -0.08]} rotation={[0, 0, -0.24]}>
        <coneGeometry args={[0.12, 0.34, 5]} />
        <meshStandardMaterial color="#E9F6C7" roughness={0.9} />
      </mesh>
    </group>
  )
}

export function CloudParkWindLine({
  position,
  rotation = [0, 0, 0],
  length = 0.7,
  color = '#FFF4CE',
  opacity = 0.36,
}: {
  position: Vec3
  rotation?: Vec3
  length?: number
  color?: string
  opacity?: number
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[length, 0.018]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} side={DoubleSide} />
    </mesh>
  )
}
