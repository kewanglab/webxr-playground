import { useMemo } from 'react'
import {
  BackSide,
  BufferAttribute,
  Color,
  SphereGeometry,
} from 'three'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

/**
 * Large inverted gradient sphere (unlit). Segment counts match xr-3d spec (~24×16).
 */
export function Skydome() {
  const { xr } = usePlaygroundTheme()

  const geometry = useMemo(() => {
    const top = new Color(xr.skydome.top)
    const horizon = new Color(xr.skydome.horizon)
    const bottom = new Color(xr.skydome.bottom)
    const radius = 130
    const geo = new SphereGeometry(radius, 24, 16)
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)
    const blend = new Color()
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const ny = Math.max(-1, Math.min(1, y / radius))
      const t = (ny + 1) / 2
      if (t > 0.5) blend.copy(horizon).lerp(top, (t - 0.5) * 2)
      else blend.copy(bottom).lerp(horizon, t * 2)
      colors[i * 3] = blend.r
      colors[i * 3 + 1] = blend.g
      colors[i * 3 + 2] = blend.b
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    return geo
  }, [xr.skydome.top, xr.skydome.horizon, xr.skydome.bottom])

  return (
    <mesh geometry={geometry} renderOrder={-1000}>
      <meshBasicMaterial
        vertexColors
        side={BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}
