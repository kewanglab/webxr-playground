import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

const SAMPLE = 30
const UI_INTERVAL = 0.35

type FpsStatus = {
  color: string
}

function getFpsStatus(fps: number): FpsStatus {
  // Quest/WebXR comfort bands: 90 Hz target, 72 Hz lower stable target, sub-45 is not usable.
  if (fps >= 90) return { color: '#6f9e78' }
  if (fps >= 72) return { color: '#d8b56d' }
  if (fps >= 45) return { color: '#c9794d' }
  return { color: '#b64f4a' }
}

/**
 * In-headset FPS / frame time (drei Stats uses DOM and is not visible in XR).
 */
export function InXRStats() {
  const { xr } = usePlaygroundTheme()
  const [label, setLabel] = useState('FPS —')
  const [status, setStatus] = useState<FpsStatus>(() => getFpsStatus(90))
  const acc = useRef(0)
  const samples = useRef(0)
  const sinceUi = useRef(0)

  useFrame((_, delta) => {
    const d = Math.max(delta, 1e-4)
    acc.current += 1 / d
    samples.current += 1
    sinceUi.current += delta

    if (samples.current >= SAMPLE && sinceUi.current >= UI_INTERVAL) {
      const avgFps = acc.current / samples.current
      setLabel(`FPS ${avgFps.toFixed(0)}`)
      setStatus(getFpsStatus(avgFps))
      acc.current = 0
      samples.current = 0
      sinceUi.current = 0
    }
  })

  return (
    <group>
      <Text
        position={[0, 0.004, 0]}
        fontSize={0.032}
        color={xr.hud.textMetric}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor={xr.hud.panelFill}
      >
        {label}
      </Text>
      <mesh position={[0, -0.04, 0.002]} renderOrder={-497}>
        <planeGeometry args={[0.21, 0.004]} />
        <meshBasicMaterial
          color={status.color}
          transparent
          opacity={0.92}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
