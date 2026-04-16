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
  scalePlatformRoundForTargetCube,
} from '../../xr/visual/kitNative'
import { useKitModel } from '../../xr/visual/useKitModel'
import { useInitialEyeLevelOffset } from '../../xr/core/useInitialEyeLevelOffset'
import { LabHeading } from '../LabHeading'

const SELECTION_FOCUS_Y = 1.26

type SelectionTokenVariant = 'ray' | 'touch' | 'grab'

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

function SelectionBackdropPiers({
  stone,
  rim,
  shadow,
}: {
  stone: string
  rim: string
  shadow: string
}) {
  return (
    <group>
      {[-1, 1].map((dir) => (
        <group key={`selection-pier-${dir}`} position={[dir * 1.78, 0, -2.16]}>
          <mesh position={[0, 0.74, 0]}>
            <boxGeometry args={[0.22, 1.48, 0.18]} />
            <meshStandardMaterial
              color={stone}
              roughness={0.94}
              emissive={shadow}
              emissiveIntensity={0.035}
            />
          </mesh>
          <mesh position={[0, 1.49, 0]}>
            <boxGeometry args={[0.36, 0.08, 0.24]} />
            <meshStandardMaterial color={stone} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.08, 0.01]}>
            <boxGeometry args={[0.42, 0.16, 0.28]} />
            <meshStandardMaterial color={stone} roughness={0.92} />
          </mesh>
          <mesh position={[-dir * 0.08, 0.82, 0.095]}>
            <boxGeometry args={[0.035, 1.06, 0.012]} />
            <meshBasicMaterial color={rim} transparent opacity={0.5} />
          </mesh>
        </group>
      ))}
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
  variant,
}: {
  position: [number, number, number]
  color: string
  size: number
  confirmScaleBoost: number
  enableHaptics: boolean
  enableAudio: boolean
  pointerType: 'ray' | 'touch' | 'grab'
  label: string
  variant: SelectionTokenVariant
}) {
  const { xr, shell } = usePlaygroundTheme()
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
  const activeColor = selected
    ? shell.state.success
    : hovered
      ? shell.accent.primaryHover
      : color
  const haloColor = selected ? shell.state.success : hovered ? color : xr.accent.amber

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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -s / 2 + 0.01, 0]}>
        <ringGeometry args={[s * 0.48, s * 0.62, 36]} />
        <meshBasicMaterial
          color={haloColor}
          transparent
          opacity={selected || hovered ? 0.76 : 0.46}
          depthWrite={false}
        />
      </mesh>
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
        <boxGeometry args={[s * 1.05, s * 1.16, s * 1.05]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <group position={[0, -s / 2 + 0.13, 0]}>
        <SelectionToken
          variant={variant}
          size={s}
          activeColor={activeColor}
          bodyColor={xr.accent.stone}
          trimColor={xr.accent.mustard}
          systemColor={xr.accent.cyan}
          selected={selected}
          hovered={hovered}
        />
      </group>
      <Text
        position={[0, -s / 2 - XR_KIT_NATIVE.platformRoundTopY * pedestalScale + 0.06, 0.18]}
        fontSize={0.058}
        color={xr.hud.textPrimary}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor={xr.void.clear}
      >
        {label}
      </Text>
    </group>
  )
}

function SelectionToken({
  variant,
  size,
  activeColor,
  bodyColor,
  trimColor,
  systemColor,
  selected,
  hovered,
}: {
  variant: SelectionTokenVariant
  size: number
  activeColor: string
  bodyColor: string
  trimColor: string
  systemColor: string
  selected: boolean
  hovered: boolean
}) {
  const glow = selected ? systemColor : activeColor
  const glowIntensity = hovered || selected ? 0.14 : 0.05

  if (variant === 'ray') {
    return (
      <group position={[0, size * 0.18, 0]} rotation={[-0.18, 0, 0]}>
        <mesh>
          <boxGeometry args={[size * 0.52, size * 0.82, size * 0.08]} />
          <meshStandardMaterial
            color={bodyColor}
            roughness={0.62}
            metalness={0.06}
            emissive={glow}
            emissiveIntensity={glowIntensity}
          />
        </mesh>
        <mesh position={[0, 0, size * 0.046]}>
          <boxGeometry args={[size * 0.4, size * 0.58, size * 0.018]} />
          <meshStandardMaterial
            color={activeColor}
            roughness={0.4}
            metalness={0.04}
            emissive={glow}
            emissiveIntensity={0.12}
          />
        </mesh>
        <mesh position={[0, 0, size * 0.06]}>
          <ringGeometry args={[size * 0.075, size * 0.12, 24]} />
          <meshBasicMaterial color={systemColor} transparent opacity={0.72} />
        </mesh>
        <mesh position={[0, 0, size * 0.064]}>
          <circleGeometry args={[size * 0.025, 18]} />
          <meshBasicMaterial color={trimColor} transparent opacity={0.8} />
        </mesh>
      </group>
    )
  }

  if (variant === 'touch') {
    return (
      <group position={[0, size * 0.08, 0]}>
        <mesh>
          <cylinderGeometry args={[size * 0.34, size * 0.38, size * 0.13, 36]} />
          <meshStandardMaterial
            color={bodyColor}
            roughness={0.5}
            metalness={0.04}
            emissive={glow}
            emissiveIntensity={glowIntensity}
          />
        </mesh>
        <mesh position={[0, size * 0.075, 0]}>
          <cylinderGeometry args={[size * 0.28, size * 0.3, size * 0.035, 36]} />
          <meshStandardMaterial
            color={activeColor}
            roughness={0.32}
            metalness={0.08}
            emissive={glow}
            emissiveIntensity={0.12}
          />
        </mesh>
        {[0.08, 0.15, 0.22].map((r) => (
          <mesh key={r} position={[0, size * 0.097, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[size * r, size * 0.007, 6, 36, Math.PI * 1.45]} />
            <meshBasicMaterial color={systemColor} transparent opacity={0.48} />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group position={[0, size * 0.18, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[size * 0.18, size * 0.34, 8, 18]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.4}
          metalness={0.08}
          emissive={glow}
          emissiveIntensity={glowIntensity}
        />
      </mesh>
      {[-1, 1].map((dir) => (
        <mesh key={dir} position={[dir * size * 0.31, 0, 0]}>
          <sphereGeometry args={[size * 0.15, 18, 14]} />
          <meshStandardMaterial
            color={activeColor}
            roughness={0.34}
            metalness={0.08}
            emissive={glow}
            emissiveIntensity={0.1}
          />
        </mesh>
      ))}
      <mesh position={[0, size * 0.16, 0]}>
        <torusGeometry args={[size * 0.21, size * 0.018, 8, 28]} />
        <meshStandardMaterial
          color={trimColor}
          roughness={0.38}
          metalness={0.1}
          emissive={trimColor}
          emissiveIntensity={0.08}
        />
      </mesh>
    </group>
  )
}

export function SelectionLab() {
  const { labAccents, xr, shell } = usePlaygroundTheme()
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
          stone={xr.accent.stone}
          rim={labAccents.selection.secondary}
          voidColor={xr.floor.emissive}
        />
        <SelectableTarget
          position={[-0.62, 1.16, -0.74]}
          color={labAccents.selection.primary}
          size={size}
          confirmScaleBoost={boost}
          enableHaptics={enableHaptics}
          enableAudio={enableAudio}
          pointerType="ray"
          label="Ray (controller)"
          variant="ray"
        />
        <SelectableTarget
          position={[0, 1.22, -0.82]}
          color={labAccents.selection.secondary}
          size={size}
          confirmScaleBoost={boost}
          enableHaptics={enableHaptics}
          enableAudio={enableAudio}
          pointerType="touch"
          label="Direct touch (hands)"
          variant="touch"
        />
        <SelectableTarget
          position={[0.62, 1.16, -0.74]}
          color={shell.accent.soft}
          size={size}
          confirmScaleBoost={boost}
          enableHaptics={enableHaptics}
          enableAudio={enableAudio}
          pointerType="grab"
          label="Hand pinch (grab)"
          variant="grab"
        />

        <SelectionBackdropPiers
          stone={xr.accent.stone}
          rim={labAccents.selection.secondary}
          shadow={xr.floor.emissive}
        />
      </group>
    </group>
  )
}
