import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three'
import { usePlaygroundTheme } from '../../../xr/theme/PlaygroundThemeContext'

const PETAL_COUNT = 60
const FALL_AREA = { x: 0.8, y: 0.6, z: 0.6 }
const CENTER = new Vector3(0, 1.1, -0.78)

const vertexShader = `
  attribute float size;
  attribute float alpha;
  varying float vAlpha;
  void main() {
    vAlpha = alpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  uniform vec3 petalColor;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.2, d);
    gl_FragColor = vec4(petalColor, soft * vAlpha);
  }
`

export function CherryPetals() {
  const pointsRef = useRef<Points>(null)
  const preset = usePlaygroundTheme()
  const petalHex = preset.shell.accent.soft

  const { geometry, positions, velocities, phases } = useMemo(() => {
    const geo = new BufferGeometry()
    const pos = new Float32Array(PETAL_COUNT * 3)
    const sizes = new Float32Array(PETAL_COUNT)
    const alphas = new Float32Array(PETAL_COUNT)
    const vel = new Float32Array(PETAL_COUNT * 3)
    const ph = new Float32Array(PETAL_COUNT)

    for (let i = 0; i < PETAL_COUNT; i++) {
      pos[i * 3] = CENTER.x + (Math.random() - 0.5) * FALL_AREA.x
      pos[i * 3 + 1] = CENTER.y + Math.random() * FALL_AREA.y
      pos[i * 3 + 2] = CENTER.z + (Math.random() - 0.5) * FALL_AREA.z

      sizes[i] = 0.008 + Math.random() * 0.012
      alphas[i] = 0.3 + Math.random() * 0.5

      vel[i * 3] = (Math.random() - 0.5) * 0.02
      vel[i * 3 + 1] = -(0.02 + Math.random() * 0.03)
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.015

      ph[i] = Math.random() * Math.PI * 2
    }

    geo.setAttribute('position', new BufferAttribute(pos, 3))
    geo.setAttribute('size', new BufferAttribute(sizes, 1))
    geo.setAttribute('alpha', new BufferAttribute(alphas, 1))

    return { geometry: geo, positions: pos, velocities: vel, phases: ph }
  }, [])

  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  const material = useMemo(() => {
    const c = new Color(petalHex)
    return new ShaderMaterial({
      uniforms: {
        petalColor: { value: new Vector3(c.r, c.g, c.b) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    })
  }, [petalHex])

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  useFrame((_, delta) => {
    const posAttr = geometry.attributes.position as BufferAttribute
    const arr = posAttr.array as Float32Array
    const t = performance.now() * 0.001

    for (let i = 0; i < PETAL_COUNT; i++) {
      const i3 = i * 3
      // Drift with sine wave for fluttering
      arr[i3] += (velocities[i3] + Math.sin(t * 2 + phases[i]) * 0.008) * delta * 60
      arr[i3 + 1] += velocities[i3 + 1] * delta * 60
      arr[i3 + 2] += (velocities[i3 + 2] + Math.cos(t * 1.5 + phases[i]) * 0.006) * delta * 60

      // Respawn when below the platform
      if (arr[i3 + 1] < CENTER.y - FALL_AREA.y * 0.5) {
        arr[i3] = CENTER.x + (Math.random() - 0.5) * FALL_AREA.x
        arr[i3 + 1] = CENTER.y + FALL_AREA.y * 0.5
        arr[i3 + 2] = CENTER.z + (Math.random() - 0.5) * FALL_AREA.z
      }
    }
    posAttr.needsUpdate = true
  })

  return <points ref={pointsRef} geometry={geometry} material={material} />
}
