import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { IfInSessionMode } from '@react-three/xr'
import { useEffect, useRef, useState } from 'react'
import { useControls } from 'leva'
import { DoubleSide, Group, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { useHudReport } from '../../app/useHudReport'
import { getLabTitle, selectionTargetPositions, tuningPresets } from '../../config/labs'
import { readLevaNumber } from '../../ui/levaPlugins/readLevaNumber'
import { useHapticPulse } from '../../xr/feedback/haptics/useHapticPulse'
import { useConfirmTone } from '../../xr/feedback/audio/useConfirmTone'
import { usePlaygroundTheme } from '../../xr/theme/PlaygroundThemeContext'
import { useInitialEyeLevelOffset } from '../../xr/core/useInitialEyeLevelOffset'
import { SelectionHolo } from '../../xr/visual/holos'
import { SharedArch, StagePlatform } from '../../xr/visual/SharedScenery'
import { LabHeading } from '../LabHeading'

const SELECTION_FOCUS_Y = 1.26

type OrbVariant = 'ray' | 'pinch' | 'touch'
type OrbState = 'idle' | 'targeted' | 'confirmed'

/** Design-handoff v0.2 Section 03 timings (seconds). */
// Hover pulse cadence — slow contemplative breathing (one full cycle every ~3.3 s).
const PULSE_FREQ_HZ = 0.3
// Softens the sine wave by holding it longer at the peaks/troughs and
// accelerating through the midpoint — reads as "inhale → hold → exhale → hold"
// instead of a uniform mechanical pulse. `Math.sign(s) * |s|^EXP` with
// `EXP < 1` lifts the magnitude near the extremes and snaps it through zero.
const BREATHING_EXP = 0.6
function breathingPhase(now: number): number {
  const raw = Math.sin(now * PULSE_FREQ_HZ * Math.PI * 2)
  return Math.sign(raw) * Math.pow(Math.abs(raw), BREATHING_EXP)
}
const CONFIRM_COLLAPSE_S = 0.18
const CONFIRM_HALO_EXPAND_S = 0.22
const CONFIRM_SCALE_PULSE_S = 0.22
const CONFIRM_HOLD_S = 1.4 // halo sits at peak alpha
const CONFIRM_FADE_S = 0.4 // fade to idle
const CONFIRM_TOTAL_S =
  CONFIRM_HALO_EXPAND_S + CONFIRM_HOLD_S + CONFIRM_FADE_S // 2.02s

/**
 * Small 3D affordance hint floating next to the orb.
 *  - ray: forward-pointing arrow chevrons
 *  - pinch: horizontal caliper chevrons (converge)
 *  - touch: flat contact ring
 * Tint from `xr.affordance.*` tokens. Rendered above the orb so it doesn't intercept pointer events.
 */
function AffordanceGlyph({
  variant,
  radius,
  tint,
}: {
  variant: OrbVariant
  radius: number
  tint: string
}) {
  const glyphY = radius + 0.07
  const glyphScale = Math.max(0.04, radius * 0.5)

  if (variant === 'ray') {
    return (
      <group position={[0, glyphY, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            position={[0, i * glyphScale * 0.22, 0]}
            rotation={[0, 0, Math.PI / 4]}
          >
            <planeGeometry args={[glyphScale * 0.6, glyphScale * 0.1]} />
            <meshBasicMaterial color={tint} transparent opacity={0.55 - i * 0.12} depthWrite={false} />
          </mesh>
        ))}
      </group>
    )
  }

  if (variant === 'pinch') {
    return (
      <group position={[0, glyphY, 0]}>
        {[-1, 1].map((dir) => (
          <mesh
            key={dir}
            position={[dir * glyphScale * 0.55, 0, 0]}
            rotation={[0, 0, dir * Math.PI * 0.75]}
          >
            <planeGeometry args={[glyphScale * 0.5, glyphScale * 0.1]} />
            <meshBasicMaterial color={tint} transparent opacity={0.7} depthWrite={false} />
          </mesh>
        ))}
      </group>
    )
  }

  // touch
  return (
    <mesh position={[0, glyphY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[glyphScale * 0.45, glyphScale * 0.58, 32]} />
      <meshBasicMaterial color={tint} transparent opacity={0.65} depthWrite={false} />
    </mesh>
  )
}

/**
 * Tri-state selection orb per design-handoff v0.2.
 * - idle → targeted on pointer enter (120ms ease-out fade + 1.2Hz pulse on rings)
 * - targeted → confirmed on pointer down (180ms ring collapse + 220ms halo/scale pulse)
 * - confirmed → idle auto-revert ~2s later (400ms halo fade)
 */
function StateOrb({
  variant,
  position,
  size,
  pointerType,
  label,
  sublabel,
  enableHaptics,
  enableAudio,
}: {
  variant: OrbVariant
  position: [number, number, number]
  size: number
  pointerType: 'ray' | 'touch' | 'grab'
  label: string
  sublabel: string
  enableHaptics: boolean
  enableAudio: boolean
}) {
  const { xr } = usePlaygroundTheme()
  const [state, setState] = useState<OrbState>('idle')
  const groupRef = useRef<Group>(null)
  const sphereMatRef = useRef<MeshStandardMaterial>(null)
  const innerRingMatRef = useRef<MeshBasicMaterial>(null)
  const outerRingMatRef = useRef<MeshBasicMaterial>(null)
  const haloGroupRef = useRef<Group>(null)
  const haloMatRef = useRef<MeshBasicMaterial>(null)
  const stateStartedAt = useRef(0)
  const pulse = useHapticPulse()
  const playTone = useConfirmTone()

  const radius = size / 2
  const innerRingRadius = radius + 0.025
  const outerRingRadius = radius + 0.045
  const targetedColors = xr.orb.targeted
  const confirmedColors = xr.orb.confirmed
  // Idle now adopts the targeted (hover) look statically — same base color, same
  // mid-pulse emissive intensity — but with no animation and no rings. Hover then
  // layers in the pulse + both rings as the actual hover affordance.
  const IDLE_EMISSIVE = 1.75

  // Reset timer whenever state changes.
  useEffect(() => {
    stateStartedAt.current = performance.now() / 1000
  }, [state])

  useFrame(() => {
    const now = performance.now() / 1000
    const elapsed = now - stateStartedAt.current

    // Sphere body: base color + emissive by state.
    const mat = sphereMatRef.current
    if (mat) {
      if (state === 'idle') {
        // Static hover-like glow — same intensity as the targeted pulse midpoint.
        mat.emissiveIntensity = IDLE_EMISSIVE
      } else if (state === 'targeted') {
        // Emissive breathing pulse 1.6 ↔ 1.9.
        mat.emissiveIntensity = IDLE_EMISSIVE + 0.15 * breathingPhase(now)
      } else if (state === 'confirmed') {
        // Decay from 0.8 to 0.3 over the confirmed lifetime.
        const frac = Math.min(elapsed / CONFIRM_TOTAL_S, 1)
        mat.emissiveIntensity = 0.8 - 0.5 * frac
      }
    }

    // Inner / outer rings.
    if (state === 'targeted') {
      // Both rings breathe from fully transparent (0) to fully opaque (1) on the
      // shared breathing curve — full fade-in/fade-out per cycle, in sync with the
      // sphere's emissive pulse.
      const ringOpacity = (breathingPhase(now) + 1) * 0.5
      if (innerRingMatRef.current) innerRingMatRef.current.opacity = ringOpacity
      if (outerRingMatRef.current) outerRingMatRef.current.opacity = ringOpacity
    } else if (state === 'confirmed' && elapsed < CONFIRM_COLLAPSE_S) {
      // Collapse over 180ms — scale inner ring down to 0 as we leave targeted.
      const frac = 1 - elapsed / CONFIRM_COLLAPSE_S
      if (innerRingMatRef.current) innerRingMatRef.current.opacity = 0.78 * frac
      if (outerRingMatRef.current) outerRingMatRef.current.opacity = 0.5 * frac
    } else {
      // Idle and confirmed post-collapse — no rings.
      if (innerRingMatRef.current) innerRingMatRef.current.opacity = 0
      if (outerRingMatRef.current) outerRingMatRef.current.opacity = 0
    }

    // Scale pulse on confirmed entry: 1 → 1.08 → 1 over 220ms.
    if (groupRef.current) {
      if (state === 'confirmed' && elapsed < CONFIRM_SCALE_PULSE_S) {
        const phase = elapsed / CONFIRM_SCALE_PULSE_S
        const s = 1 + 0.08 * Math.sin(phase * Math.PI)
        groupRef.current.scale.setScalar(s)
      } else {
        groupRef.current.scale.setScalar(1)
      }
    }

    // Halo: expand to r×2 over 220ms, hold, fade over 400ms at end.
    if (haloGroupRef.current && haloMatRef.current) {
      if (state === 'confirmed') {
        let expand = 0
        let alpha = 0
        if (elapsed < CONFIRM_HALO_EXPAND_S) {
          // Expanding (ease-out).
          expand = 1 - Math.pow(1 - elapsed / CONFIRM_HALO_EXPAND_S, 3)
          alpha = expand
        } else if (elapsed < CONFIRM_HALO_EXPAND_S + CONFIRM_HOLD_S) {
          expand = 1
          alpha = 1
        } else {
          // Fade to zero.
          const fadeFrac = Math.min(
            (elapsed - CONFIRM_HALO_EXPAND_S - CONFIRM_HOLD_S) / CONFIRM_FADE_S,
            1,
          )
          expand = 1
          alpha = 1 - fadeFrac
        }
        haloGroupRef.current.scale.setScalar(Math.max(expand, 0.001))
        haloMatRef.current.opacity = alpha
      } else {
        haloGroupRef.current.scale.setScalar(0.001)
        haloMatRef.current.opacity = 0
      }
    }

    // Auto-revert to idle after total lifetime.
    if (state === 'confirmed' && elapsed >= CONFIRM_TOTAL_S) {
      setState('idle')
    }
  })

  const handlePointerEnter = () => {
    if (state === 'idle') setState('targeted')
  }
  const handlePointerLeave = () => {
    if (state === 'targeted') setState('idle')
  }
  const handlePointerDown = () => {
    setState('confirmed')
    if (enableHaptics) pulse('right', 0.6, 30)
    if (enableAudio) playTone(720, 80)
  }

  // Pick the current base color for the sphere material (deeply tied to state).
  // Idle now uses the targeted base so the orbs read as "lit / available" by default;
  // confirmed swaps to its own success color during the post-click pulse.
  let sphereBase = targetedColors.base
  if (state === 'confirmed') sphereBase = confirmedColors.base

  // Halo peak scale is r×2 (spec). The group scale above represents 0..1 progress.
  const haloPeakRadius = radius * 2

  // Affordance tint by variant.
  const affordanceTint =
    variant === 'ray'
      ? xr.affordance.rayArrow
      : variant === 'pinch'
        ? xr.affordance.pinchCalipers
        : xr.affordance.touchRing

  return (
    <group ref={groupRef} position={position}>
      {/* Sphere body — pointer target. */}
      <mesh
        pointerEventsType={{ allow: pointerType }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      >
        <sphereGeometry args={[radius, 40, 28]} />
        <meshStandardMaterial
          ref={sphereMatRef}
          color={sphereBase}
          emissive={sphereBase}
          emissiveIntensity={0.15}
          roughness={0.55}
          metalness={0}
        />
      </mesh>

      {/* Targeted rings — flat, face-up on Y plane through orb centre. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[innerRingRadius - 0.004, innerRingRadius + 0.004, 48]} />
        <meshBasicMaterial
          ref={innerRingMatRef}
          color={targetedColors.ring}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[outerRingRadius - 0.003, outerRingRadius + 0.003, 48]} />
        <meshBasicMaterial
          ref={outerRingMatRef}
          color={targetedColors.ringOuter}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>

      {/* Confirmed halo — sphere shell that expands from 0 to 2r. */}
      <group ref={haloGroupRef} scale={0.001}>
        <mesh>
          <sphereGeometry args={[haloPeakRadius, 32, 20]} />
          <meshBasicMaterial
            ref={haloMatRef}
            color={confirmedColors.halo}
            transparent
            opacity={0}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
      </group>

      {/* Affordance glyph above the orb. */}
      <AffordanceGlyph variant={variant} radius={radius} tint={affordanceTint} />

      {/* Labels below the orb. */}
      <Text
        position={[0, -radius - 0.07, 0]}
        fontSize={0.058}
        color={xr.hud.textPrimary}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor={xr.void.clear}
      >
        {label}
      </Text>
      <Text
        position={[0, -radius - 0.125, 0]}
        fontSize={0.034}
        color={xr.hud.textMuted}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor={xr.void.clear}
      >
        {sublabel}
      </Text>
    </group>
  )
}

export function SelectionLab() {
  const preset = usePlaygroundTheme()
  const { labAccents, xr } = preset
  const isCloudPark = preset.id === 'cloud-park'
  const defaults = tuningPresets.controller.selection
  const { targetSize, confirmScaleBoost, enableHaptics, enableAudio } = useControls('Selection', {
    // Plain sliders here — Leva's custom stepper plugin was unreliable for this folder (size could collapse).
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

  useHudReport(
    {
      metrics: [
        { label: 'TARGET', value: size.toFixed(2) },
        { label: 'BOOST', value: boost.toFixed(2) },
        { label: 'HAPTICS', value: enableHaptics ? 'ON' : 'OFF' },
        { label: 'AUDIO', value: enableAudio ? 'ON' : 'OFF' },
      ],
      methodLabel: 'Selection · cross-XR',
      trial: null,
    },
    [size, boost, enableHaptics, enableAudio],
  )

  return (
    <group>
      <LabHeading
        title={getLabTitle('selection')}
        subtitle={`Target ${size.toFixed(2)} · Confirm boost ${boost.toFixed(2)} · Haptics ${enableHaptics ? 'on' : 'off'} · Audio ${enableAudio ? 'on' : 'off'}`}
        archPosition={[0, 0, -2.5]}
      />
      <IfInSessionMode deny="immersive-ar">
        <SharedArch position={[0, 0, -2.5]} holo={<SelectionHolo />} />
        <StagePlatform position={[0, 0, -2.5]} />
      </IfInSessionMode>
      <group position={[0, stageOffsetY, 0]}>
        <StateOrb
          variant="ray"
          position={selectionTargetPositions.ray}
          size={size}
          pointerType="ray"
          label="RAY"
          sublabel="far · controller"
          enableHaptics={enableHaptics}
          enableAudio={enableAudio}
        />
        <StateOrb
          variant="pinch"
          position={selectionTargetPositions.pinch}
          size={size}
          pointerType="grab"
          label="PINCH"
          sublabel="near · hand"
          enableHaptics={enableHaptics}
          enableAudio={enableAudio}
        />
        <StateOrb
          variant="touch"
          position={selectionTargetPositions.touch}
          size={size}
          pointerType="touch"
          label="TOUCH"
          sublabel="near · finger"
          enableHaptics={enableHaptics}
          enableAudio={enableAudio}
        />

      </group>
    </group>
  )
}
