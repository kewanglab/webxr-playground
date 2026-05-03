import { DoubleSide, type Texture } from 'three'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

type Vec3 = [number, number, number]

/**
 * Cloud Park world dressing. Distant set-pieces (clouds, sun disc, atmospheric
 * bands) were stripped — they competed with the SharedArch as the focal element
 * and read as floating cards at the new eye-level POV. Only the under-feet
 * shadow blob remains, providing a subtle ground-contact cue.
 */
export function CloudParkWorld() {
  const preset = usePlaygroundTheme()
  if (preset.id !== 'cloud-park') return null

  const { xr } = preset

  return (
    <group>
      <CloudParkShadowBlob position={[0, 0.012, -2.2]} scale={[5.7, 1, 2.3]} color={xr.accent.cyan} opacity={0.04} />
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
      <circleGeometry args={[0.5, 20]} />
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
  return (
    <group position={position} scale={scale}>
      <CloudParkShadowBlob position={[0, 0.005, 0]} scale={[2.1, 1, 1.18]} opacity={0.08} />
      <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58, 0.75, 30]} />
        <meshBasicMaterial color={rimColor} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.052, 0]} scale={[1.42, 0.14, 0.78]}>
        <sphereGeometry args={[0.58, 16, 8]} />
        <meshStandardMaterial color={cloudColor} roughness={0.92} emissive={shadeColor} emissiveIntensity={0.025} />
      </mesh>
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
        <cylinderGeometry args={[0.28, 0.34, 0.16, 24]} />
        <meshStandardMaterial color={bodyColor} roughness={0.84} emissive={accentColor} emissiveIntensity={0.02} />
      </mesh>
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
      <CloudParkWindLine position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]} length={0.82} color={glow} opacity={0.34} />
      <mesh position={[0, 0.052, -0.04]} rotation={[Math.PI / 2, 0, Math.PI]}>
        <coneGeometry args={[0.12, 0.26, 3]} />
        <meshBasicMaterial color={glow} transparent opacity={0.46} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.035, 0.17]} scale={[1.2, 0.32, 0.76]}>
        <sphereGeometry args={[0.07, 8, 5]} />
        <meshBasicMaterial color={stone} transparent opacity={0.5} depthWrite={false} />
      </mesh>
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
        <capsuleGeometry args={[0.018, 0.1, 5, 8]} />
        <meshStandardMaterial color={stone} roughness={0.84} emissive={secondary} emissiveIntensity={0.035} />
      </mesh>
      <mesh position={[0, 0.025, 0]} scale={[1.08, 0.78, 1.08]}>
        <sphereGeometry args={[0.056, 12, 8]} />
        <meshStandardMaterial color={active ? primary : '#FFF3D4'} roughness={0.54} emissive={accent} emissiveIntensity={active ? 0.16 : 0.06} />
      </mesh>
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
        <cylinderGeometry args={[0.36, 0.42, 0.044, 28]} />
        <meshStandardMaterial color={trayColor} roughness={0.86} />
      </mesh>
      <mesh position={[0, 0.028, 0]} receiveShadow scale={[1.08, 1, 0.74]}>
        <cylinderGeometry args={[0.32, 0.32, 0.009, 28]} />
        <meshStandardMaterial map={sandMap} color={sandColor} roughness={1} />
      </mesh>
      <mesh position={[0, 0.052, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.08, 0.74, 1]}>
        <torusGeometry args={[0.34, 0.017, 6, 30]} />
        <meshStandardMaterial color={rimColor} roughness={0.8} />
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
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.58, 0]}>
        <torusGeometry args={[1.1, 0.07, 8, 36, Math.PI]} />
        <meshStandardMaterial color={stone} roughness={0.88} emissive={rim} emissiveIntensity={0.055} />
      </mesh>
      <mesh position={[0, 0.58, 0.018]}>
        <torusGeometry args={[0.9, 0.014, 6, 28, Math.PI]} />
        <meshBasicMaterial color={rim} transparent opacity={0.46} depthWrite={false} />
      </mesh>
      {[-1.08, 1.08].map((x) => (
        <mesh key={`cloud-arch-leg-${x}`} position={[x, 0.2, 0]}>
          <capsuleGeometry args={[0.064, 0.72, 6, 10]} />
          <meshStandardMaterial color={stone} roughness={0.92} emissive={rim} emissiveIntensity={0.03} />
        </mesh>
      ))}
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
      <mesh position={[0.06, 0.15, 0]} rotation={[0, 0, 0.18]}>
        <coneGeometry args={[0.16, 0.4, 5]} />
        <meshStandardMaterial color="#BFEAD5" roughness={0.88} />
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
