import { Grid } from '@react-three/drei'
import { useControls } from 'leva'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'
import { Skydome } from '../visual/Skydome'

export function VRScene() {
  const { xr } = usePlaygroundTheme()
  const { showHeightRef } = useControls('Debug', {
    showHeightRef: false,
  })

  return (
    <>
      <color attach="background" args={[xr.void.clear]} />
      <fog attach="fog" args={[xr.fog.color, xr.fog.near, xr.fog.far]} />
      <Skydome />
      <Grid
        infiniteGrid
        fadeDistance={24}
        fadeStrength={2.2}
        cellSize={0.5}
        cellThickness={0.38}
        cellColor={xr.grid.cell}
        sectionSize={2}
        sectionThickness={0.78}
        sectionColor={xr.grid.section}
      />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.001, 0]}
        receiveShadow
      >
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color={xr.floor.albedo}
          emissive={xr.floor.emissive}
          emissiveIntensity={0.06}
          roughness={0.92}
          metalness={0}
        />
      </mesh>

      {showHeightRef && (
        <mesh position={[1, 0.85, -1]} raycast={() => null}>
          <capsuleGeometry args={[0.25, 1.2, 6, 12]} />
          <meshBasicMaterial color="#666666" wireframe />
        </mesh>
      )}
    </>
  )
}
