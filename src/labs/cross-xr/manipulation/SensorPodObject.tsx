type SensorPodObjectProps = {
  objectSize: number
  baseColor: string
  accentColor: string
  restAccent: string
  active?: boolean
  transparent?: boolean
  opacity?: number
  depthWrite?: boolean
}

export function SensorPodObject({
  objectSize,
  baseColor,
  accentColor,
  restAccent,
  active = false,
  transparent = false,
  opacity = 1,
  depthWrite = true,
}: SensorPodObjectProps) {
  const accent = active ? accentColor : restAccent
  const common = { transparent, opacity, depthWrite }

  return (
    <group>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[objectSize * 0.18, objectSize * 0.36, 8, 20]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.28}
          metalness={0.18}
          emissive={active ? accentColor : '#000000'}
          emissiveIntensity={active ? 0.05 : 0}
          {...common}
        />
      </mesh>
      <mesh position={[0, 0, objectSize * 0.42]} castShadow>
        <sphereGeometry args={[objectSize * 0.2, 24, 20]} />
        <meshStandardMaterial
          color="#efdeba"
          roughness={0.12}
          metalness={0.14}
          emissive={accent}
          emissiveIntensity={0.18}
          {...common}
        />
      </mesh>
      <mesh position={[0, objectSize * 0.28, -objectSize * 0.04]} castShadow>
        <cylinderGeometry args={[objectSize * 0.028, objectSize * 0.028, objectSize * 0.24, 12]} />
        <meshStandardMaterial
          color="#cac3b7"
          roughness={0.26}
          metalness={0.16}
          {...common}
        />
      </mesh>
      <mesh position={[0, objectSize * 0.42, -objectSize * 0.04]} castShadow>
        <sphereGeometry args={[objectSize * 0.09, 18, 16]} />
        <meshStandardMaterial
          color="#cceaf0"
          roughness={0.14}
          metalness={0.08}
          emissive={accentColor}
          emissiveIntensity={0.16}
          {...common}
        />
      </mesh>
      <mesh position={[0, -objectSize * 0.24, -objectSize * 0.02]} castShadow>
        <boxGeometry args={[objectSize * 0.3, objectSize * 0.07, objectSize * 0.2]} />
        <meshStandardMaterial
          color={accentColor}
          roughness={0.24}
          metalness={0.18}
          emissive={accentColor}
          emissiveIntensity={active ? 0.1 : 0.04}
          {...common}
        />
      </mesh>
      <mesh position={[0, 0, -objectSize * 0.44]} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[objectSize * 0.14, objectSize * 0.028, 10, 28]} />
        <meshStandardMaterial
          color="#cabfb1"
          roughness={0.22}
          metalness={0.14}
          emissive={accentColor}
          emissiveIntensity={active ? 0.08 : 0.02}
          {...common}
        />
      </mesh>
      <mesh position={[-objectSize * 0.26, -objectSize * 0.05, -objectSize * 0.08]} castShadow>
        <sphereGeometry args={[objectSize * 0.1, 18, 16]} />
        <meshStandardMaterial
          color={accentColor}
          roughness={0.2}
          metalness={0.12}
          emissive={accent}
          emissiveIntensity={active ? 0.12 : 0.06}
          {...common}
        />
      </mesh>
      <mesh position={[objectSize * 0.22, 0, -objectSize * 0.14]} castShadow>
        <boxGeometry args={[objectSize * 0.07, objectSize * 0.18, objectSize * 0.16]} />
        <meshStandardMaterial color="#bcb4a8" roughness={0.24} metalness={0.12} {...common} />
      </mesh>
      {[-1, 1].map((dir) => (
        <mesh
          key={`hero-wing-${dir}`}
          position={[dir * objectSize * 0.1, 0, objectSize * 0.28]}
          rotation={[0, 0, dir * 0.42]}
          castShadow
        >
          <boxGeometry args={[objectSize * 0.08, objectSize * 0.16, objectSize * 0.03]} />
          <meshStandardMaterial
            color={accent}
            roughness={0.24}
            metalness={0.14}
            emissive={accent}
            emissiveIntensity={0.18}
            {...common}
          />
        </mesh>
      ))}
    </group>
  )
}
