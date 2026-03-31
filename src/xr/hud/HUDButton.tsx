import { Text } from '@react-three/drei'
import { useState } from 'react'
import { DoubleSide } from 'three'
import { useConfirmTone } from '../feedback/audio/useConfirmTone'
import { useHapticPulse } from '../feedback/haptics/useHapticPulse'

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
  color = '#0f172a',
  hoverColor = '#1d4ed8',
  onPress,
}: HUDButtonProps) {
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
          color={hovered ? hoverColor : color}
          transparent
          opacity={hovered ? 0.78 : 0.62}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Text
        position={[0, 0, 0.004]}
        fontSize={0.024}
        color="#f8fafc"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.003}
        outlineColor="#020617"
      >
        {label}
      </Text>
    </group>
  )
}
