import { useFrame, useThree } from '@react-three/fiber'
import { IfInSessionMode, TeleportTarget, useXRInputSourceState } from '@react-three/xr'
import { useControls } from 'leva'
import { stepperNumber } from '../../ui/levaPlugins/stepperNumber'
import { useRef } from 'react'
import { Vector3 } from 'three'
import { usePlaygroundStore } from '../../app/store'
import { getLabTitle, tuningPresets } from '../../config/labs'
import { LabHeading } from '../LabHeading'
import { readLevaNumber } from '../../ui/levaPlugins/readLevaNumber'
import { usePlaygroundTheme } from '../../xr/theme/PlaygroundThemeContext'
import {
  scaleColumnAstraToHeight,
  scaleColumnHollowToHeight,
  scalePropRailToLength,
} from '../../xr/visual/kitNative'
import { KitInstance } from '../../xr/visual/useKitModel'

export function LocomotionLab() {
  const { labAccents, xr } = usePlaygroundTheme()
  const defaults = tuningPresets.controller.locomotion
  const {
    stickHand,
    moveSpeed,
    moveDeadzone,
    turnDeadzone,
    turnMode,
    snapTurnAngleDeg,
    smoothTurnSpeedDeg,
  } = useControls('Locomotion', {
    stickHand: { value: defaults.stickHand, options: ['left', 'right'] },
    moveSpeed: stepperNumber({ value: defaults.moveSpeed, min: 0.2, max: 4, step: 0.1 }),
    moveDeadzone: stepperNumber({
      value: defaults.moveDeadzone,
      min: 0.05,
      max: 0.5,
      step: 0.05,
    }),
    // Keep turn threshold stricter than movement to avoid accidental turning.
    turnDeadzone: stepperNumber({
      value: defaults.turnDeadzone,
      min: 0.2,
      max: 0.95,
      step: 0.05,
    }),
    turnMode: { value: defaults.turnMode as 'snap' | 'smooth' },
    snapTurnAngleDeg: stepperNumber({
      value: defaults.snapTurnAngleDeg,
      min: 15,
      max: 90,
      step: 15,
    }),
    smoothTurnSpeedDeg: stepperNumber({
      value: defaults.smoothTurnSpeedDeg,
      min: 30,
      max: 220,
      step: 10,
    }),
  })

  const leftController = useXRInputSourceState('controller', 'left')
  const rightController = useXRInputSourceState('controller', 'right')
  const controller = stickHand === 'left' ? leftController : rightController

  const { camera } = useThree()

  const originPosition = usePlaygroundStore((s) => s.originPosition)
  const originRotationY = usePlaygroundStore((s) => s.originRotationY)
  const setOriginPosition = usePlaygroundStore((s) => s.setOriginPosition)
  const setOriginRotationY = usePlaygroundStore((s) => s.setOriginRotationY)

  const turnLatch = useRef(false)

  const moveSpeedN = readLevaNumber(moveSpeed, defaults.moveSpeed)
  const moveDeadN = readLevaNumber(moveDeadzone, defaults.moveDeadzone)
  const turnDeadN = readLevaNumber(turnDeadzone, defaults.turnDeadzone)
  const snapDegN = readLevaNumber(snapTurnAngleDeg, defaults.snapTurnAngleDeg)
  const smoothDegN = readLevaNumber(smoothTurnSpeedDeg, defaults.smoothTurnSpeedDeg)

  useFrame((_, delta) => {
    if (!controller?.gamepad) return
    const thumbstick = controller.gamepad['xr-standard-thumbstick']
    if (!thumbstick) return

    const xAxis = thumbstick.xAxis ?? 0
    const yAxis = thumbstick.yAxis ?? 0

    const yawForward = new Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    yawForward.y = 0
    yawForward.normalize()

    // Head-relative movement with explicit origin-rotation compensation.
    // This keeps movement direction aligned after synthetic controller turning.
    yawForward.applyAxisAngle(new Vector3(0, 1, 0), originRotationY)

    // Smooth move (thumbstick forward/back). Forward stick is usually negative y.
    if (Math.abs(yAxis) > moveDeadN) {
      const nextPos = originPosition.clone().addScaledVector(
        yawForward,
        -yAxis * moveSpeedN * delta,
      )
      setOriginPosition(nextPos)
    }

    // Turning (thumbstick left/right)
    const turnActive = Math.abs(xAxis) > turnDeadN
    const snapAngleRad = (snapDegN * Math.PI) / 180
    const smoothTurnSpeedRad = (smoothDegN * Math.PI) / 180

    if (turnMode === 'snap') {
      if (turnActive && !turnLatch.current) {
        // Positive xAxis = rotate right (clockwise when viewed from above).
        const next = originRotationY + (xAxis > 0 ? snapAngleRad : -snapAngleRad)
        setOriginRotationY(next)
        turnLatch.current = true
      } else if (!turnActive) {
        turnLatch.current = false
      }
    } else {
      if (turnActive) {
        setOriginRotationY(originRotationY + xAxis * smoothTurnSpeedRad * delta)
      }
    }
  })

  const markers: [number, number, number][] = [
    [-2, 0.01, -3],
    [2, 0.01, -3],
    [0, 0.01, -5],
  ]

  return (
    <group>
      <LabHeading
        title={getLabTitle('locomotion')}
        subtitle={`${stickHand} stick · Move ${moveSpeedN.toFixed(1)} · ${turnMode} (${turnMode === 'snap' ? `${Math.round(snapDegN)}°` : `${Math.round(smoothDegN)}°/s`})`}
      />

      <IfInSessionMode allow="immersive-vr">
        <TeleportTarget
          onTeleport={(pos) => {
            // Teleport updates the user's XROrigin feet position.
            setOriginPosition(pos.clone())
          }}
        >
          <mesh position={[0, 0.0, -3]} rotation={[0, 0, 0]} scale={[10, 0.05, 10]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </TeleportTarget>
      </IfInSessionMode>

      {markers.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.5, 28]} />
          <meshStandardMaterial
            color={labAccents.locomotion.primary}
            transparent
            opacity={0.32}
            emissive={labAccents.locomotion.primary}
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}

      {[-2, -4, -6, -8].map((z) => (
        <KitInstance
          key={`rail-${z}`}
          name="prop_rail"
          position={[0, 0.02, z]}
          scale={scalePropRailToLength(2.35)}
          rotation={[0, Math.PI / 2, 0]}
          options={{
            color: xr.accent.stone,
            emissive: labAccents.locomotion.primary,
            emissiveIntensity: 0.14,
            roughness: 0.75,
          }}
        />
      ))}

      <KitInstance
        name="column_hollow"
        position={[-1.4, 0, -6]}
        scale={scaleColumnHollowToHeight(3.1)}
        options={{ color: xr.accent.stone, roughness: 0.9 }}
      />
      <KitInstance
        name="column_astra"
        position={[0.6, 0, -10]}
        scale={scaleColumnAstraToHeight(3.05)}
        options={{
          color: xr.accent.stone,
          emissive: xr.accent.amber,
          emissiveIntensity: 0.07,
          roughness: 0.85,
        }}
      />
      <KitInstance
        name="column_hollow"
        position={[-0.8, 0, -15]}
        scale={scaleColumnHollowToHeight(3.35)}
        options={{ color: xr.accent.stone, roughness: 0.9 }}
      />

      {/* Native wall pieces stack in kit space (bottom y≈0, top y≈3–5); offset top so they meet. */}
      <group position={[0, 0, 2.8]} rotation={[0, Math.PI, 0]}>
        <KitInstance
          name="wall_bottom_straight"
          position={[0, 0, 0]}
          scale={1}
          options={{ color: xr.accent.stone, roughness: 0.92 }}
        />
        <KitInstance
          name="wall_top_straight"
          position={[0, -2.98, 0]}
          scale={1}
          options={{ color: xr.accent.stone, roughness: 0.9 }}
        />
      </group>
    </group>
  )
}
