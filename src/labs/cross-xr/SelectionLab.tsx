import { Text } from '@react-three/drei'
import { useState } from 'react'
import { useControls } from 'leva'
import { getLabTitle, tuningPresets } from '../../config/labs'
import { readLevaNumber } from '../../ui/levaPlugins/readLevaNumber'
import { useHapticPulse } from '../../xr/feedback/haptics/useHapticPulse'
import { useConfirmTone } from '../../xr/feedback/audio/useConfirmTone'
import { usePlaygroundTheme } from '../../xr/theme/PlaygroundThemeContext'
import {
  XR_KIT_NATIVE,
  scaleColumnAstraToHeight,
  scaleColumnHollowToHeight,
  scalePlatformRoundForTargetCube,
} from '../../xr/visual/kitNative'
import { KitInstance, useKitModel } from '../../xr/visual/useKitModel'
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
  const { xr } = usePlaygroundTheme()
  const [hovered, setHovered] = useState(false)
  const [selected, setSelected] = useState(false)
  const pulse = useHapticPulse()
  const playTone = useConfirmTone()

  const s = Math.max(0.12, size)
  const pedestal = useKitModel('platform_round', {
    color: xr.accent.stone,
    emissive: xr.accent.mustard,
    emissiveIntensity: 0.18,
    roughness: 0.85,
  })
  const pedestalScale = scalePlatformRoundForTargetCube(s)

  return (
    <group position={position} scale={hovered ? 1 + confirmScaleBoost : 1}>
      <primitive
        object={pedestal}
        position={[
          0,
          -s / 2 - XR_KIT_NATIVE.platformRoundTopY * pedestalScale,
          0,
        ]}
        scale={pedestalScale}
      />
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
        color={xr.hud.textPrimary}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor={xr.void.clear}
      >
        {label}
      </Text>
    </group>
  )
}

export function SelectionLab() {
  const { labAccents, xr } = usePlaygroundTheme()
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
        color={labAccents.selection.primary}
        size={size}
        confirmScaleBoost={boost}
        enableHaptics={enableHaptics}
        enableAudio={enableAudio}
        pointerType="ray"
        label="Ray (controller)"
      />
      <SelectableTarget
        position={[0, 1.45, -0.9]}
        color={labAccents.selection.secondary}
        size={size}
        confirmScaleBoost={boost}
        enableHaptics={enableHaptics}
        enableAudio={enableAudio}
        pointerType="touch"
        label="Direct touch (hands)"
      />
      <SelectableTarget
        position={[0.45, 1.25, -1.25]}
        color={xr.accent.cyan}
        size={size}
        confirmScaleBoost={boost}
        enableHaptics={enableHaptics}
        enableAudio={enableAudio}
        pointerType="grab"
        label="Hand pinch (grab)"
      />

      <KitInstance
        name="column_hollow"
        position={[-2.2, 0, -9]}
        scale={scaleColumnHollowToHeight(2.85)}
        options={{ color: xr.accent.stone, roughness: 0.9, emissive: xr.accent.amber, emissiveIntensity: 0.06 }}
      />
      <KitInstance
        name="column_astra"
        position={[2.2, 0, -10.5]}
        scale={scaleColumnAstraToHeight(2.95)}
        options={{ color: xr.accent.stone, roughness: 0.88 }}
      />
    </group>
  )
}
