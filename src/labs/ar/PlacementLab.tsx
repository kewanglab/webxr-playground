import { Text } from '@react-three/drei'
import { useControls } from 'leva'

export function PlacementLab() {
  useControls('Placement', {
    snapToGrid: false,
    gridSize: { value: 0.1, min: 0.01, max: 0.5, step: 0.01 },
  })

  return (
    <group>
      <Text
        position={[0, 1.5, -2]}
        fontSize={0.15}
        color="#888"
        anchorX="center"
        anchorY="middle"
      >
        Placement Lab — Phase 2
      </Text>
      <mesh position={[0, 1, -2]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshStandardMaterial color="#f97316" wireframe />
      </mesh>
    </group>
  )
}
