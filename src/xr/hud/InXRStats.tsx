import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

const SAMPLE = 30
const UI_INTERVAL = 0.35

/**
 * In-headset FPS / frame time (drei Stats uses DOM and is not visible in XR).
 */
export function InXRStats() {
  const { xr } = usePlaygroundTheme()
  const [label, setLabel] = useState('FPS: —')
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
      const ms = 1000 / avgFps
      setLabel(`FPS: ${avgFps.toFixed(0)} | ${ms.toFixed(1)}ms`)
      acc.current = 0
      samples.current = 0
      sinceUi.current = 0
    }
  })

  return (
    <Text
      position={[0, 0.11, 0]}
      fontSize={0.036}
      color={xr.hud.textMetric}
      anchorX="left"
      anchorY="middle"
      outlineWidth={0.004}
      outlineColor={xr.hud.panelFill}
    >
      {label}
    </Text>
  )
}
