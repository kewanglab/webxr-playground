import { Grid } from '@react-three/drei'

export function VRScene() {
  return (
    <>
      <Grid
        infiniteGrid
        fadeDistance={30}
        fadeStrength={3}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#444"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#666"
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        receiveShadow
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
    </>
  )
}
