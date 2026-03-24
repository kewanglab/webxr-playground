import { useState } from 'react'
import { useControls } from 'leva'

function SelectableTarget({
  position,
  color,
  size,
}: {
  position: [number, number, number]
  color: string
  size: number
}) {
  const [hovered, setHovered] = useState(false)
  const [selected, setSelected] = useState(false)

  return (
    <mesh
      position={position}
      scale={hovered ? 1.15 : 1}
      onClick={() => setSelected((s) => !s)}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color={selected ? '#22c55e' : hovered ? '#f59e0b' : color}
      />
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
        position={[-0.5, 1.2, -2]}
        color="#3b82f6"
        size={targetSize}
      />
      <SelectableTarget
        position={[0, 1.5, -2.5]}
        color="#8b5cf6"
        size={targetSize}
      />
      <SelectableTarget
        position={[0.5, 1.2, -2]}
        color="#ef4444"
        size={targetSize}
      />
      <SelectableTarget
        position={[0, 0.8, -1.5]}
        color="#06b6d4"
        size={targetSize}
      />
    </group>
  )
}
