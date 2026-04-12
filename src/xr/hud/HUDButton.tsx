import { Text } from '@react-three/drei'
import { useState } from 'react'
import { DoubleSide } from 'three'
import { useConfirmTone } from '../feedback/audio/useConfirmTone'
import { useHapticPulse } from '../feedback/haptics/useHapticPulse'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

type HUDButtonProps = {
  label: string
  position: [number, number, number]
  width?: number
  height?: number
  color?: string
  hoverColor?: string
  onPress: () => void
}

export function HUDButton({
  label,
  position,
  width = 0.13,
  height = 0.044,
  color,
  hoverColor,
  onPress,
}: HUDButtonProps) {
  const { xr } = usePlaygroundTheme()
  const base = color ?? xr.hud.panelFill
  const hover = hoverColor ?? xr.hud.panelBorder
  const [hovered, setHovered] = useState(false)
  const pulse = useHapticPulse()
  const playTone = useConfirmTone()

  return (
    <group position={position} scale={hovered ? 1.04 : 1}>
      <mesh
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={(e) => {
          e.stopPropagation()
          pulse('right', 0.35, 40)
          playTone(620, 50)
          onPress()
        }}
      >
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          color={hovered ? hover : base}
          transparent
          opacity={hovered ? 0.78 : 0.62}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Text
        position={[0, 0, 0.004]}
        fontSize={0.024}
        color={xr.hud.textPrimary}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.003}
        outlineColor={xr.hud.panelFill}
      >
        {label}
      </Text>
    </group>
  )
}
