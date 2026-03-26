import { Text } from '@react-three/drei'
import { useState } from 'react'
import { useControls } from 'leva'

function SelectableTarget({
  position,
  color,
  size,
  pointerType,
  label,
}: {
  position: [number, number, number]
  color: string
  size: number
  pointerType: 'ray' | 'touch' | 'grab'
  label: string
}) {
  const [hovered, setHovered] = useState(false)
  const [selected, setSelected] = useState(false)

  return (
    <mesh
      position={position}
      scale={hovered ? 1.15 : 1}
      pointerEventsType={{ allow: pointerType }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={() => setSelected((s) => !s)}
    >
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color={selected ? '#22c55e' : hovered ? '#f59e0b' : color}
      />
      <Text
        position={[0, size / 2 + 0.12, 0]}
        fontSize={0.12}
        color="#e5e7eb"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {label}
      </Text>
    </mesh>
  )
}

export function SelectionLab() {
  const { targetSize } = useControls('Selection', {
    targetSize: { value: 0.3, min: 0.1, max: 1, step: 0.05 },
  })

  return (
    <group>
      <SelectableTarget
        position={[-0.45, 1.25, -1.25]}
        color="#3b82f6"
        size={targetSize}
        pointerType="ray"
        label="Ray (controller)"
      />
      <SelectableTarget
        position={[0, 1.45, -0.9]}
        color="#06b6d4"
        size={targetSize}
        pointerType="touch"
        label="Direct touch (hands)"
      />
      <SelectableTarget
        position={[0.45, 1.25, -1.25]}
        color="#d946ef"
        size={targetSize}
        pointerType="grab"
        label="Hand pinch (grab)"
      />
    </group>
  )
}
