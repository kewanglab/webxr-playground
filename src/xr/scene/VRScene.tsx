import { Grid } from '@react-three/drei'
import { useControls } from 'leva'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'
import { CloudParkWorld } from '../visual/CloudParkScenery'
import { SharedArch, StagePlatform } from '../visual/SharedScenery'
import { Skydome } from '../visual/Skydome'

export function VRScene() {
  const preset = usePlaygroundTheme()
  const { xr } = preset
  const isCloudPark = preset.id === 'cloud-park'
  const { showHeightRef, showSharedScenery } = useControls('Debug', {
    showHeightRef: false,
    // Design-handoff v0.2 Section 04: shared arch + stage frame all VR labs.
    // Some labs (Selection, Locomotion, Manipulation) already have per-lab stage scenery; toggle
    // this off if the combination feels cluttered on-device.
    showSharedScenery: true,
  })

  return (
    <>
      <color attach="background" args={[xr.void.clear]} />
      <fog attach="fog" args={[xr.fog.color, xr.fog.near, xr.fog.far]} />
      <Skydome />
      <CloudParkWorld />
      <Grid
        infiniteGrid
        fadeDistance={isCloudPark ? 16 : 24}
        fadeStrength={isCloudPark ? 4.4 : 2.2}
        cellSize={0.5}
        cellThickness={isCloudPark ? 0.13 : 0.38}
        cellColor={isCloudPark ? '#B9E7D0' : xr.grid.cell}
        sectionSize={2}
        sectionThickness={isCloudPark ? 0.28 : 0.78}
        sectionColor={isCloudPark ? '#DCE5A8' : xr.grid.section}
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
          emissiveIntensity={isCloudPark ? 0.035 : 0.06}
          roughness={isCloudPark ? 0.98 : 0.92}
          metalness={0}
        />
      </mesh>

      {showSharedScenery && (
        <>
          <SharedArch position={[0, 0, 0]} />
          <StagePlatform position={[0, 0, 0]} />
        </>
      )}

      {showHeightRef && (
        <mesh position={[1, 0.85, -1]} raycast={() => null}>
          <capsuleGeometry args={[0.25, 1.2, 6, 12]} />
          <meshBasicMaterial color="#666666" wireframe />
        </mesh>
      )}
    </>
  )
}
