import { useEffect, useMemo } from 'react'
import {
  BackSide,
  Color,
  ShaderMaterial,
  SphereGeometry,
} from 'three'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

const SKYDOME_RADIUS = 130

const VERTEX_SHADER = /* glsl */ `
  varying float vWorldY;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldY = worldPosition.y;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  uniform vec3 topColor;
  uniform vec3 horizonColor;
  uniform vec3 bottomColor;
  uniform float radius;

  varying float vWorldY;

  void main() {
    float ny = clamp(vWorldY / radius, -1.0, 1.0);
    float t = (ny + 1.0) * 0.5;
    vec3 col;
    if (t > 0.5) {
      col = mix(horizonColor, topColor, (t - 0.5) * 2.0);
    } else {
      col = mix(bottomColor, horizonColor, t * 2.0);
    }
    gl_FragColor = vec4(col, 1.0);
  }
`

/**
 * Inverted gradient sphere rendered with a custom ShaderMaterial: the gradient is
 * computed per-pixel from world-space Y rather than interpolated across mesh facets,
 * so the sky reads as a smooth band on any sphere resolution. Sphere segment count
 * just needs to be high enough that the silhouette stays round at radius 130 m.
 */
export function Skydome() {
  const { xr } = usePlaygroundTheme()

  const geometry = useMemo(() => new SphereGeometry(SKYDOME_RADIUS, 24, 16), [])

  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        topColor: { value: new Color(xr.skydome.top) },
        horizonColor: { value: new Color(xr.skydome.horizon) },
        bottomColor: { value: new Color(xr.skydome.bottom) },
        radius: { value: SKYDOME_RADIUS },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      side: BackSide,
      depthWrite: false,
    })
  }, [xr.skydome.top, xr.skydome.horizon, xr.skydome.bottom])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return <mesh geometry={geometry} material={material} renderOrder={-1000} />
}
