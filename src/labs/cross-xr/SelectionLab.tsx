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
import {
  CloudParkArch,
  CloudParkPerch,
  CloudParkShadowBlob,
  CloudParkSideIsland,
  CloudParkWindLine,
  FloatingCloudMat,
} from '../../xr/visual/CloudParkScenery'
import { useKitModel } from '../../xr/visual/useKitModel'
import { useInitialEyeLevelOffset } from '../../xr/core/useInitialEyeLevelOffset'
import { LabHeading } from '../LabHeading'

const SELECTION_FOCUS_Y = 1.26

type SelectionTokenVariant = 'ray' | 'touch' | 'grab'

function SelectionStage({
  stone,
  rim,
  voidColor,
  isCloudPark,
}: {
  stone: string
  rim: string
  voidColor: string
  isCloudPark: boolean
}) {
  if (isCloudPark) {
    return (
      <group>
        <FloatingCloudMat
          position={[0, 0.018, -1.48]}
          scale={1.55}
          cloudColor={stone}
          shadeColor="#DDF4E3"
          rimColor={rim}
        />
        <CloudParkShadowBlob
          position={[0, 0.02, -0.98]}
          scale={[3.2, 1, 1.45]}
          color={rim}
          opacity={0.11}
        />
        <mesh position={[0, 0.76, -2.58]}>
          <planeGeometry args={[2.75, 1.08]} />
          <meshBasicMaterial
            color={stone}
            transparent
            opacity={0.42}
            depthWrite={false}
          />
        </mesh>
        <CloudParkArch position={[0, 0.28, -2.5]} scale={1.18} stone={stone} rim={rim} />
        <CloudParkWindLine
          position={[-0.88, 1.76, -2.42]}
          rotation={[0, 0, -0.18]}
          length={0.76}
          opacity={0.28}
        />
        <CloudParkWindLine
          position={[0.94, 1.88, -2.4]}
          rotation={[0, 0, 0.16]}
          length={0.9}
          opacity={0.22}
        />
      </group>
    )
  }

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
  isCloudPark,
}: {
  stone: string
  rim: string
  shadow: string
  isCloudPark: boolean
}) {
  if (isCloudPark) {
    return (
      <group>
        <CloudParkSideIsland position={[-2.05, 0.04, -1.82]} scale={0.78} rimColor={rim} />
        <CloudParkSideIsland position={[2.05, 0.05, -1.96]} scale={0.72} rimColor={rim} />
        {[-1, 1].map((dir) => (
          <group key={`cloud-selection-marker-${dir}`} position={[dir * 2.02, 0.16, -1.86]}>
            <FloatingCloudMat
              position={[0, -0.16, 0.02]}
              scale={0.28}
              cloudColor={stone}
              shadeColor="#DDF4E3"
              rimColor={rim}
            />
            <mesh position={[0, 0.32, 0]}>
              <capsuleGeometry args={[0.047, 0.62, 7, 12]} />
              <meshStandardMaterial
                color={stone}
                roughness={0.92}
                emissive={shadow}
                emissiveIntensity={0.04}
              />
            </mesh>
            <mesh position={[0, 0.69, 0.012]}>
              <sphereGeometry args={[0.115, 12, 8]} />
              <meshStandardMaterial color={rim} roughness={0.58} emissive={rim} emissiveIntensity={0.08} />
            </mesh>
            <mesh position={[0, 0.49, 0.014]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.1, 0.008, 6, 24]} />
              <meshBasicMaterial color={rim} transparent opacity={0.28} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </group>
    )
  }

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
  const preset = usePlaygroundTheme()
  const { xr, shell } = preset
  const isCloudPark = preset.id === 'cloud-park'
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
      {isCloudPark ? (
        <CloudParkPerch
          position={[0, -s / 2 - 0.035, 0]}
          scale={s}
          bodyColor={xr.accent.stone}
          rimColor={haloColor}
          accentColor={activeColor}
        />
      ) : (
        <primitive
          object={pedestal}
          position={[
            0,
            -s / 2 - XR_KIT_NATIVE.platformRoundTopY * pedestalScale,
            0,
          ]}
          scale={pedestalScale}
        />
      )}
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
          isCloudPark={isCloudPark}
        />
      </group>
      <Text
        position={
          isCloudPark
            ? [0, -s / 2 - 0.105, 0.2]
            : [0, -s / 2 - XR_KIT_NATIVE.platformRoundTopY * pedestalScale + 0.06, 0.18]
        }
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
  isCloudPark,
}: {
  variant: SelectionTokenVariant
  size: number
  activeColor: string
  bodyColor: string
  trimColor: string
  systemColor: string
  selected: boolean
  hovered: boolean
  isCloudPark: boolean
}) {
  const glow = selected ? systemColor : activeColor
  const glowIntensity = hovered || selected ? 0.14 : 0.05

  if (isCloudPark) {
    return (
      <CloudParkSelectionToken
        variant={variant}
        size={size}
        activeColor={activeColor}
        bodyColor={bodyColor}
        trimColor={trimColor}
        systemColor={systemColor}
        glow={glow}
        glowIntensity={glowIntensity}
      />
    )
  }

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

function CloudParkSelectionToken({
  variant,
  size,
  activeColor,
  bodyColor,
  trimColor,
  systemColor,
  glow,
  glowIntensity,
}: {
  variant: SelectionTokenVariant
  size: number
  activeColor: string
  bodyColor: string
  trimColor: string
  systemColor: string
  glow: string
  glowIntensity: number
}) {
  if (variant === 'ray') {
    return (
      <group position={[0, size * 0.2, 0]} rotation={[-0.28, 0.12, -0.08]}>
        <mesh scale={[size * 0.42, size * 0.6, size * 0.08]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={activeColor}
            roughness={0.42}
            metalness={0.02}
            emissive={glow}
            emissiveIntensity={glowIntensity + 0.06}
          />
        </mesh>
        <mesh position={[0, -size * 0.42, -size * 0.04]} rotation={[0.18, 0, 0]}>
          <coneGeometry args={[size * 0.13, size * 0.5, 3]} />
          <meshStandardMaterial color={trimColor} roughness={0.72} />
        </mesh>
        {[-1, 1].map((dir) => (
          <mesh
            key={`cloud-kite-tail-${dir}`}
            position={[dir * size * 0.11, -size * 0.52, -size * 0.01]}
            rotation={[0.2, 0, dir * 0.28]}
          >
            <coneGeometry args={[size * 0.04, size * 0.22, 3]} />
            <meshStandardMaterial color={dir < 0 ? systemColor : trimColor} roughness={0.7} />
          </mesh>
        ))}
        <CloudParkWindLine
          position={[-size * 0.32, -size * 0.18, size * 0.08]}
          rotation={[0, 0, -0.32]}
          length={size * 1.0}
          color={systemColor}
          opacity={0.42}
        />
      </group>
    )
  }

  if (variant === 'touch') {
    return (
      <group position={[0, size * 0.1, 0]}>
        <FloatingCloudMat
          position={[0, -size * 0.08, 0]}
          scale={size * 0.68}
          cloudColor={bodyColor}
          shadeColor="#DFF4E6"
          rimColor={trimColor}
        />
        <mesh position={[0, size * 0.12, 0]}>
          <cylinderGeometry args={[size * 0.34, size * 0.42, size * 0.12, 28]} />
          <meshStandardMaterial
            color={activeColor}
            roughness={0.38}
            metalness={0.02}
            emissive={glow}
            emissiveIntensity={glowIntensity + 0.05}
          />
        </mesh>
        {[0.14, 0.24, 0.34].map((r, i) => (
          <mesh
            key={`cloud-touch-ripple-${r}`}
            position={[0, size * (0.21 + i * 0.012), 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <torusGeometry args={[size * r, size * 0.006, 6, 28]} />
            <meshBasicMaterial color={systemColor} transparent opacity={0.42 - i * 0.08} />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group position={[0, size * 0.2, 0]} rotation={[0.08, 0, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size * 0.24, size * 0.045, 10, 34]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.58}
          metalness={0}
          emissive={glow}
          emissiveIntensity={glowIntensity + 0.02}
        />
      </mesh>
      {[-1, 1].map((dir) => (
        <mesh key={`cloud-grab-orb-${dir}`} position={[dir * size * 0.28, size * 0.01, 0]}>
          <sphereGeometry args={[size * 0.15, 16, 12]} />
          <meshStandardMaterial
            color={activeColor}
            roughness={0.35}
            emissive={glow}
            emissiveIntensity={glowIntensity + 0.03}
          />
        </mesh>
      ))}
      <mesh position={[0, size * 0.22, 0]}>
        <sphereGeometry args={[size * 0.1, 12, 10]} />
        <meshStandardMaterial color={trimColor} roughness={0.45} emissive={trimColor} emissiveIntensity={0.12} />
      </mesh>
      <mesh position={[0, -size * 0.23, 0]} scale={[1.35, 0.32, 0.9]}>
        <sphereGeometry args={[size * 0.13, 12, 8]} />
        <meshStandardMaterial color={bodyColor} roughness={0.78} emissive={glow} emissiveIntensity={0.04} />
      </mesh>
      <CloudParkWindLine
        position={[0, -size * 0.16, size * 0.1]}
        rotation={[0, 0, 0.08]}
        length={size * 0.78}
        color={systemColor}
        opacity={0.28}
      />
    </group>
  )
}

export function SelectionLab() {
  const preset = usePlaygroundTheme()
  const { labAccents, xr, shell } = preset
  const isCloudPark = preset.id === 'cloud-park'
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
          isCloudPark={isCloudPark}
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
          isCloudPark={isCloudPark}
        />
      </group>
    </group>
  )
}
