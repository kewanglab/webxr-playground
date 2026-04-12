import { Text } from '@react-three/drei'
import { useState } from 'react'
import { useControls } from 'leva'
import { getLabTitle, tuningPresets } from '../../config/labs'
import { readLevaNumber } from '../../ui/levaPlugins/readLevaNumber'
import { useHapticPulse } from '../../xr/feedback/haptics/useHapticPulse'
import { useConfirmTone } from '../../xr/feedback/audio/useConfirmTone'
import { LabHeading } from '../LabHeading'

function SelectableTarget({
  position,
  color,
  size,
  confirmScaleBoost,
  enableHaptics,
  enableAudio,
  pointerType,
  label,
}: {
  position: [number, number, number]
  color: string
  size: number
  confirmScaleBoost: number
  enableHaptics: boolean
  enableAudio: boolean
  pointerType: 'ray' | 'touch' | 'grab'
  label: string
}) {
  const [hovered, setHovered] = useState(false)
  const [selected, setSelected] = useState(false)
  const pulse = useHapticPulse()
  const playTone = useConfirmTone()

  const s = Math.max(0.12, size)

  return (
    <group position={position} scale={hovered ? 1 + confirmScaleBoost : 1}>
      <mesh
        pointerEventsType={{ allow: pointerType }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={() => {
          setSelected((prev) => !prev)
          if (enableHaptics) pulse('right', 0.45, 55)
          if (enableAudio) playTone(700, 70)
        }}
      >
        <boxGeometry args={[s, s, s]} />
        <meshStandardMaterial
          color={selected ? '#22c55e' : hovered ? '#f59e0b' : color}
        />
      </mesh>
      <Text
        position={[0, s / 2 + 0.12, 0]}
        fontSize={0.12}
        color="#e5e7eb"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {label}
      </Text>
    </group>
  )
}

export function SelectionLab() {
  const defaults = tuningPresets.controller.selection
  const { targetSize, confirmScaleBoost, enableHaptics, enableAudio } = useControls('Selection', {
    // Plain sliders here — Leva’s custom stepper plugin was unreliable for this folder (size could collapse).
    targetSize: { value: defaults.targetSize, min: 0.1, max: 1, step: 0.05 },
    confirmScaleBoost: { value: defaults.confirmScaleBoost, min: 0.05, max: 0.35, step: 0.01 },
    enableHaptics: defaults.enableHaptics,
    enableAudio: defaults.enableAudio,
  })

  const size = Math.max(0.12, readLevaNumber(targetSize, defaults.targetSize))
  const boost = readLevaNumber(confirmScaleBoost, defaults.confirmScaleBoost)

  return (
    <group>
      <LabHeading
        title={getLabTitle('selection')}
        subtitle={`Target ${size.toFixed(2)} · Confirm boost ${boost.toFixed(2)} · Haptics ${enableHaptics ? 'on' : 'off'} · Audio ${enableAudio ? 'on' : 'off'}`}
      />
      <SelectableTarget
        position={[-0.45, 1.25, -1.25]}
        color="#3b82f6"
        size={size}
        confirmScaleBoost={boost}
        enableHaptics={enableHaptics}
        enableAudio={enableAudio}
        pointerType="ray"
        label="Ray (controller)"
      />
      <SelectableTarget
        position={[0, 1.45, -0.9]}
        color="#06b6d4"
        size={size}
        confirmScaleBoost={boost}
        enableHaptics={enableHaptics}
        enableAudio={enableAudio}
        pointerType="touch"
        label="Direct touch (hands)"
      />
      <SelectableTarget
        position={[0.45, 1.25, -1.25]}
        color="#d946ef"
        size={size}
        confirmScaleBoost={boost}
        enableHaptics={enableHaptics}
        enableAudio={enableAudio}
        pointerType="grab"
        label="Hand pinch (grab)"
      />
    </group>
  )
}
