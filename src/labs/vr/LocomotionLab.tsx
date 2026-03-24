import { Text } from '@react-three/drei'
import { useControls } from 'leva'

export function LocomotionLab() {
  useControls('Locomotion', {
    moveSpeed: { value: 2, min: 0.5, max: 5, step: 0.5 },
    snapTurnAngle: { value: 45, min: 15, max: 90, step: 15 },
  })

  const markers: [number, number, number][] = [
    [-2, 0.01, -3],
    [2, 0.01, -3],
    [0, 0.01, -5],
  ]

  return (
    <group>
      <Text
        position={[0, 1.5, -2]}
        fontSize={0.15}
        color="#888"
        anchorX="center"
        anchorY="middle"
      >
        Locomotion Lab — Phase 2
      </Text>
      {markers.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.5, 32]} />
          <meshStandardMaterial color="#22d3ee" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  )
}
