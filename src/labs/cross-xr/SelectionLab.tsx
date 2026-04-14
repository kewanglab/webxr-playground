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
import { useInitialEyeLevelOffset } from '../../xr/core/useInitialEyeLevelOffset'
import { LabHeading } from '../LabHeading'

const SELECTION_FOCUS_Y = 1.26

function SelectionStage({
  stone,
  rim,
  voidColor,
}: {
  stone: string
  rim: string
  voidColor: string
}) {
  return (
    <group>
      <mesh position={[0, 0.03, -1.48]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.42, 44]} />
        <meshStandardMaterial
          color={stone}
          roughness={0.96}
          metalness={0}
          emissive={voidColor}
          emissiveIntensity={0.08}
        />
      </mesh>
      <mesh position={[0, 0.042, -1.48]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.94, 1.22, 48]} />
        <meshStandardMaterial
          color={rim}
          roughness={0.55}
          emissive={rim}
          emissiveIntensity={0.18}
        />
      </mesh>
      <mesh position={[0, 1.28, -2.48]}>
        <torusGeometry args={[1.62, 0.085, 12, 54, Math.PI * 1.08]} />
        <meshStandardMaterial
          color={stone}
          roughness={0.92}
          emissive={rim}
          emissiveIntensity={0.1}
        />
      </mesh>
      <mesh position={[0, 1.28, -2.5]}>
        <torusGeometry args={[1.38, 0.02, 8, 40, Math.PI * 1.08]} />
        <meshBasicMaterial color={rim} transparent opacity={0.75} />
      </mesh>
      <mesh position={[0, 0.72, -2.52]}>
        <boxGeometry args={[2.55, 1.24, 0.08]} />
        <meshStandardMaterial
          color={stone}
          roughness={0.98}
          metalness={0}
          emissive={voidColor}
          emissiveIntensity={0.05}
        />
      </mesh>
    </group>
  )
}

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
  const stageOffsetY = useInitialEyeLevelOffset({
    referenceY: SELECTION_FOCUS_Y,
    eyeOffsetFromHead: -0.24,
  })

  return (
    <group>
      <LabHeading
        title={getLabTitle('selection')}
        subtitle={`Target ${size.toFixed(2)} · Confirm boost ${boost.toFixed(2)} · Haptics ${enableHaptics ? 'on' : 'off'} · Audio ${enableAudio ? 'on' : 'off'}`}
      />
      <group position={[0, stageOffsetY, 0]}>
        <SelectionStage
          stone={xr.accent.seal}
          rim={labAccents.selection.secondary}
          voidColor={xr.void.clear}
        />
        <SelectableTarget
          position={[-0.72, 1.18, -1.58]}
          color={labAccents.selection.primary}
          size={size}
          confirmScaleBoost={boost}
          enableHaptics={enableHaptics}
          enableAudio={enableAudio}
          pointerType="ray"
          label="Ray (controller)"
        />
        <SelectableTarget
          position={[0, 1.34, -1.12]}
          color={labAccents.selection.secondary}
          size={size}
          confirmScaleBoost={boost}
          enableHaptics={enableHaptics}
          enableAudio={enableAudio}
          pointerType="touch"
          label="Direct touch (hands)"
        />
        <SelectableTarget
          position={[0.72, 1.18, -1.58]}
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
          position={[-2.35, 0, -4.25]}
          scale={scaleColumnHollowToHeight(2.75)}
          options={{
            color: xr.accent.stone,
            roughness: 0.9,
            emissive: xr.accent.amber,
            emissiveIntensity: 0.07,
          }}
        />
        <KitInstance
          name="column_astra"
          position={[2.55, 0, -5.35]}
          scale={scaleColumnAstraToHeight(3.15)}
          options={{
            color: xr.accent.stone,
            roughness: 0.88,
            emissive: xr.accent.amber,
            emissiveIntensity: 0.05,
          }}
        />
      </group>
    </group>
  )
}
