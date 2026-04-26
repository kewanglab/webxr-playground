import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

export function SharedScene() {
  const { xr } = usePlaygroundTheme()

  return (
    <>
      <hemisphereLight
        color={xr.light.hemi.sky}
        groundColor={xr.light.hemi.ground}
        intensity={xr.light.hemi.intensity}
      />
      <directionalLight
        position={xr.light.key.position}
        intensity={xr.light.key.intensity}
        color={xr.light.key.color}
        castShadow
      />
    </>
  )
}
