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
import { scaleColumnAstraToHeight } from '../../xr/visual/kitNative'
import { KitInstance } from '../../xr/visual/useKitModel'

function StartZone({
  fill,
  ring,
  seal,
}: {
  fill: string
  ring: string
  seal: string
}) {
  return (
    <group>
      <mesh position={[0, 0.02, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.15, 36]} />
        <meshStandardMaterial
          color={seal}
          roughness={0.95}
          emissive={seal}
          emissiveIntensity={0.05}
        />
      </mesh>
      <mesh position={[0, 0.028, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.72, 0.92, 40]} />
        <meshStandardMaterial
          color={ring}
          roughness={0.6}
          emissive={ring}
          emissiveIntensity={0.16}
        />
      </mesh>
      <mesh position={[0, 0.08, 1.02]}>
        <boxGeometry args={[2.4, 0.14, 0.5]} />
        <meshStandardMaterial color={fill} roughness={0.92} />
      </mesh>
    </group>
  )
}

function PathChevron({
  position,
  stone,
  glow,
}: {
  position: [number, number, number]
  stone: string
  glow: string
}) {
  return (
    <group position={position}>
      <mesh position={[-0.34, 0, 0]} rotation={[0, -0.62, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.92]} />
        <meshStandardMaterial
          color={stone}
          roughness={0.72}
          emissive={glow}
          emissiveIntensity={0.12}
        />
      </mesh>
      <mesh position={[0.34, 0, 0]} rotation={[0, 0.62, 0]}>
        <boxGeometry args={[0.18, 0.05, 0.92]} />
        <meshStandardMaterial
          color={stone}
          roughness={0.72}
          emissive={glow}
          emissiveIntensity={0.12}
        />
      </mesh>
    </group>
  )
}

function DestinationPortal({
  stone,
  glow,
  seal,
}: {
  stone: string
  glow: string
  seal: string
}) {
  return (
    <group position={[0, 0, -12.2]}>
      <mesh position={[-1.5, 1.45, 0]}>
        <boxGeometry args={[0.46, 2.9, 0.5]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh position={[1.5, 1.45, 0]}>
        <boxGeometry args={[0.46, 2.9, 0.5]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.08, 0]}>
        <boxGeometry args={[3.46, 0.44, 0.5]} />
        <meshStandardMaterial color={stone} roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.35, -0.04]}>
        <boxGeometry args={[2.08, 2.32, 0.08]} />
        <meshStandardMaterial
          color={seal}
          roughness={0.95}
          emissive={seal}
          emissiveIntensity={0.05}
        />
      </mesh>
      <mesh position={[0, 1.48, 0.01]}>
        <ringGeometry args={[0.42, 0.62, 48]} />
        <meshBasicMaterial color={glow} transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, 0.03, 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 36]} />
        <meshStandardMaterial
          color={seal}
          roughness={0.92}
          emissive={glow}
          emissiveIntensity={0.12}
        />
      </mesh>
      <mesh position={[0, 0.045, 0.7]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.48, 0.7, 40]} />
        <meshStandardMaterial
          color={glow}
          roughness={0.42}
          emissive={glow}
          emissiveIntensity={0.16}
        />
      </mesh>
    </group>
  )
}

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
    [0, 0.01, -3.2],
    [0, 0.01, -6.2],
    [0, 0.01, -9.2],
  ]

  return (
    <group>
      <LabHeading
        title={getLabTitle('locomotion')}
        subtitle={`${stickHand} stick · Move ${moveSpeedN.toFixed(1)} · ${turnMode} (${turnMode === 'snap' ? `${Math.round(snapDegN)}°` : `${Math.round(smoothDegN)}°/s`})`}
      />
      <StartZone
        fill={xr.accent.stone}
        ring={labAccents.locomotion.secondary}
        seal={xr.accent.seal}
      />

      <IfInSessionMode allow="immersive-vr">
        <TeleportTarget
          onTeleport={(pos) => {
            // Teleport updates the user's XROrigin feet position.
            setOriginPosition(pos.clone())
          }}
        >
          <mesh
            position={[0, 0.0, -7.2]}
            rotation={[0, 0, 0]}
            scale={[11.5, 0.05, 16.5]}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </TeleportTarget>
      </IfInSessionMode>

      {markers.map((pos, i) => (
        <mesh key={i} position={pos} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.62, 28]} />
          <meshStandardMaterial
            color={labAccents.locomotion.primary}
            transparent
            opacity={0.32}
            emissive={labAccents.locomotion.primary}
            emissiveIntensity={0.12}
          />
        </mesh>
      ))}

      {[-1.6, -3.4, -5.8, -8.3, -10.7].map((z) => (
        <PathChevron
          key={`chevron-${z}`}
          position={[0, 0.06, z]}
          stone={xr.accent.stone}
          glow={labAccents.locomotion.primary}
        />
      ))}

      {[
        [-2.55, 0.52, -4.8, 3.8],
        [2.55, 0.52, -4.8, 3.8],
        [-2.75, 0.62, -8.4, 3.6],
        [2.75, 0.62, -8.4, 3.6],
      ].map(([x, y, z, depth], i) => (
        <mesh key={`wall-${i}`} position={[x, y, z]}>
          <boxGeometry args={[0.24, 1.04, depth]} />
          <meshStandardMaterial
            color={xr.accent.stone}
            roughness={0.93}
            emissive={xr.accent.seal}
            emissiveIntensity={0.04}
          />
        </mesh>
      ))}

      {[
        [-1.2, 1.15, -6.5, 0.18, 2.3, 0.28],
        [1.2, 1.15, -6.5, 0.18, 2.3, 0.28],
        [-1.65, 1.45, -10.15, 0.24, 2.9, 0.32],
        [1.65, 1.45, -10.15, 0.24, 2.9, 0.32],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={`spire-${i}`} position={[x, y, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial
            color={xr.accent.stone}
            roughness={0.88}
            emissive={labAccents.locomotion.secondary}
            emissiveIntensity={0.05}
          />
        </mesh>
      ))}

      <DestinationPortal
        stone={xr.accent.stone}
        glow={labAccents.locomotion.primary}
        seal={xr.accent.seal}
      />
      <mesh position={[0, 0.018, -11.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.04, 40]} />
        <meshStandardMaterial
          color={xr.accent.seal}
          roughness={0.94}
          emissive={labAccents.locomotion.secondary}
          emissiveIntensity={0.06}
        />
      </mesh>
      <mesh position={[0, 0.028, -11.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.92, 40]} />
        <meshStandardMaterial
          color={labAccents.locomotion.primary}
          roughness={0.58}
          emissive={labAccents.locomotion.primary}
          emissiveIntensity={0.18}
        />
      </mesh>
      <KitInstance
        name="column_astra"
        position={[0, 0, -15.8]}
        scale={scaleColumnAstraToHeight(4.3)}
        options={{
          color: xr.accent.stone,
          emissive: xr.accent.amber,
          emissiveIntensity: 0.08,
          roughness: 0.85,
        }}
      />
    </group>
  )
}
