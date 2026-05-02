import { Line, Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { IfInSessionMode, TeleportTarget, useXRInputSourceState } from '@react-three/xr'
import { useControls } from 'leva'
import { stepperNumber } from '../../ui/levaPlugins/stepperNumber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, DoubleSide, Shape, Vector3 } from 'three'
import { useHudReport } from '../../app/useHudReport'
import { usePlaygroundStore } from '../../app/store'
import { getLabTitle, tuningPresets } from '../../config/labs'
import { LabHeading } from '../LabHeading'
import { readLevaNumber } from '../../ui/levaPlugins/readLevaNumber'
import { usePlaygroundTheme } from '../../xr/theme/PlaygroundThemeContext'
import {
  CloudParkRouteMarker,
  CloudParkShadowBlob,
  CloudParkSideIsland,
  FloatingCloudMat,
} from '../../xr/visual/CloudParkScenery'
import { LocomotionHolo } from '../../xr/visual/holos'
import { scaleColumnAstraToHeight } from '../../xr/visual/kitNative'
import { SharedArch, StagePlatform } from '../../xr/visual/SharedScenery'
import { KitInstance } from '../../xr/visual/useKitModel'

// Scratch vectors reused inside useFrame to avoid per-frame allocations.
const SCRATCH_FORWARD = new Vector3()
const FORWARD = new Vector3(0, 0, -1)
const UP = new Vector3(0, 1, 0)

/**
 * Sample a quadratic Bézier from `from` to `to`, with control point at the midpoint raised by
 * `peakY`. Returns `samples + 1` points — useful input for a drei `<Line>` used as a teleport arc.
 */
function quadArcPoints(
  from: [number, number, number],
  to: [number, number, number],
  peakY: number,
  samples = 22,
): [number, number, number][] {
  const pts: [number, number, number][] = []
  const mx = (from[0] + to[0]) * 0.5
  const my = Math.max(from[1], to[1]) + peakY
  const mz = (from[2] + to[2]) * 0.5
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const u = 1 - t
    const x = u * u * from[0] + 2 * u * t * mx + t * t * to[0]
    const y = u * u * from[1] + 2 * u * t * my + t * t * to[1]
    const z = u * u * from[2] + 2 * u * t * mz + t * t * to[2]
    pts.push([x, y, z])
  }
  return pts
}

/**
 * 3 stacked flat rings + central disc + floating numeral (or flag when `final`).
 * Per design-handoff v0.2 Section 02 — locomotion waypoint spec.
 */
function NumberedWaypoint({
  position,
  step,
  final = false,
  stepColor,
  destinationColor,
  bloomColor,
  textColor,
  textOutline,
  showBloom,
}: {
  position: [number, number, number]
  step: number
  final?: boolean
  stepColor: string
  destinationColor: string
  bloomColor: string
  textColor: string
  textOutline: string
  /** WN-only: additive-blended halo beneath the rings. */
  showBloom?: boolean
}) {
  const tint = final ? destinationColor : stepColor
  const radii = final ? [0.34, 0.22, 0.14] : [0.3, 0.2, 0.13]
  const alphas = [0.72, 0.5, 0.32]
  const discRadius = final ? 0.15 : 0.12

  return (
    <group position={position}>
      {/* Three stacked flat rings, slight y-stagger so they read as layered. */}
      {radii.map((r, i) => (
        <mesh
          key={i}
          position={[0, 0.012 + i * 0.004, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[r - 0.006, r + 0.006, 48]} />
          <meshBasicMaterial color={tint} transparent opacity={alphas[i]} depthWrite={false} />
        </mesh>
      ))}

      {/* Central disc — brighter for destination. */}
      <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[discRadius, 40]} />
        <meshStandardMaterial
          color={tint}
          roughness={0.48}
          emissive={tint}
          emissiveIntensity={final ? 0.3 : 0.14}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Additive-bloom halo (destination only, shown under WN theme). */}
      {final && showBloom && (
        <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.36, 0.54, 48]} />
          <meshBasicMaterial
            color={bloomColor}
            transparent
            opacity={0.42}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      )}

      {/* Numeral (step waypoints) or flag (destination). */}
      {final ? (
        <DestinationFlag poleColor={tint} pennantColor={tint} />
      ) : (
        <Text
          position={[0, 0.22, 0]}
          fontSize={0.18}
          color={textColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor={textOutline}
        >
          {step}
        </Text>
      )}
    </group>
  )
}

/** Pole + triangular pennant rising from the destination disc. */
function DestinationFlag({
  poleColor,
  pennantColor,
}: {
  poleColor: string
  pennantColor: string
}) {
  const pennantShape = useMemo(() => {
    const s = new Shape()
    s.moveTo(0, 0.09)
    s.lineTo(0.24, 0)
    s.lineTo(0, -0.09)
    s.closePath()
    return s
  }, [])

  return (
    <group>
      {/* Pole. */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.01, 0.012, 1.0, 8]} />
        <meshStandardMaterial
          color={poleColor}
          roughness={0.52}
          emissive={poleColor}
          emissiveIntensity={0.12}
        />
      </mesh>
      {/* Pennant — flat triangle attached to the pole. */}
      <mesh position={[0.012, 0.88, 0]}>
        <shapeGeometry args={[pennantShape]} />
        <meshStandardMaterial
          color={pennantColor}
          roughness={0.48}
          emissive={pennantColor}
          emissiveIntensity={0.22}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}

function StartZone({
  fill,
  ring,
  seal,
  isCloudPark,
}: {
  fill: string
  ring: string
  seal: string
  isCloudPark: boolean
}) {
  if (isCloudPark) {
    return (
      <group>
        <FloatingCloudMat
          position={[0, 0.02, 0.64]}
          scale={1.22}
          cloudColor={fill}
          shadeColor="#DFF4E6"
          rimColor={ring}
        />
        <CloudParkShadowBlob
          position={[0, 0.035, 0.68]}
          scale={[2.5, 1, 1.42]}
          color={seal}
          opacity={0.14}
        />
        <mesh position={[0, 0.09, 1.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.58, 0.84, 40]} />
          <meshBasicMaterial color={ring} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      </group>
    )
  }

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
  isCloudPark,
}: {
  position: [number, number, number]
  stone: string
  glow: string
  isCloudPark: boolean
}) {
  if (isCloudPark) {
    return (
      <CloudParkRouteMarker position={position} stone={stone} glow={glow} />
    )
  }

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
  isCloudPark,
}: {
  stone: string
  glow: string
  seal: string
  isCloudPark: boolean
}) {
  if (isCloudPark) {
    return (
      <group position={[0, 0, -12.2]}>
        <FloatingCloudMat
          position={[0, 0.02, 0.72]}
          scale={1.08}
          cloudColor={stone}
          shadeColor="#DFF4E6"
          rimColor={glow}
        />
        <CloudParkShadowBlob position={[0, 0.04, 0.72]} scale={[1.85, 1, 1.18]} color={seal} opacity={0.12} />
      </group>
    )
  }

  return (
    <group position={[0, 0, -12.2]}>
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

function CloudParkLocomotionScenery({
  stone,
  ring,
  seal,
}: {
  stone: string
  ring: string
  seal: string
}) {
  const sideIslands: Array<[number, number, number, number]> = [
    [-2.4, 0.02, -3.9, 0.58],
    [2.5, 0.02, -5.2, 0.62],
    [-2.55, 0.02, -7.9, 0.66],
    [2.4, 0.02, -9.2, 0.54],
  ]

  return (
    <group>
      <mesh position={[0, 0.014, -5.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.58, 10.4]} />
        <meshBasicMaterial color="#FFF4CD" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <CloudParkShadowBlob position={[0, 0.016, -5.9]} scale={[2.2, 1, 9.5]} color={ring} opacity={0.055} />
      {sideIslands.map(([x, y, z, s], i) => (
        <CloudParkSideIsland
          key={`cloud-locomotion-island-${i}`}
          position={[x, y, z]}
          scale={s}
          rimColor={ring}
        />
      ))}
      {[-3.2, -6.2, -9.2].map((z, i) => (
        <FloatingCloudMat
          key={`cloud-locomotion-checkpoint-${z}`}
          position={[0, 0.018, z]}
          scale={0.72 + i * 0.05}
          cloudColor={stone}
          shadeColor="#DFF4E6"
          rimColor={i === 1 ? seal : ring}
        />
      ))}
    </group>
  )
}

export function LocomotionLab() {
  const preset = usePlaygroundTheme()
  const { labAccents, xr } = preset
  const isCloudPark = preset.id === 'cloud-park'
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

  useHudReport(
    {
      metrics: [
        { label: 'SPEED', value: moveSpeedN.toFixed(1) },
        {
          label: 'TURN',
          value:
            turnMode === 'snap' ? `${Math.round(snapDegN)}°` : `${Math.round(smoothDegN)}°/s`,
        },
        { label: 'MODE', value: turnMode === 'snap' ? 'SNAP' : 'SMOOTH' },
        { label: 'STICK', value: (stickHand as string).toUpperCase() },
      ],
      methodLabel: 'Locomotion · VR',
      trial: null,
    },
    [moveSpeedN, snapDegN, smoothDegN, turnMode, stickHand],
  )

  useFrame((_, delta) => {
    if (!controller?.gamepad) return
    const thumbstick = controller.gamepad['xr-standard-thumbstick']
    if (!thumbstick) return

    const xAxis = thumbstick.xAxis ?? 0
    const yAxis = thumbstick.yAxis ?? 0

    const yawForward = SCRATCH_FORWARD.copy(FORWARD).applyQuaternion(camera.quaternion)
    yawForward.y = 0
    yawForward.normalize()

    // Head-relative movement with explicit origin-rotation compensation.
    // This keeps movement direction aligned after synthetic controller turning.
    yawForward.applyAxisAngle(UP, originRotationY)

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

  // Numbered teleport waypoints per spec Section 04 — step 3 is the flagged destination.
  const waypoints = useMemo<
    { position: [number, number, number]; step: number; final?: boolean }[]
  >(
    () => [
      { position: [0, 0, -3.2], step: 1 },
      { position: [0, 0, -6.2], step: 2 },
      { position: [0, 0, -9.2], step: 3, final: true },
    ],
    [],
  )
  // Dashed teleport arcs: origin → W1 → W2 → W3. Origin is slightly forward of user start so the
  // first arc doesn't collide with the StartZone ring.
  const arcSegments = useMemo(() => {
    const chain: [number, number, number][] = [
      [0, 0.08, 0.3],
      ...waypoints.map(
        (w) => [w.position[0], 0.08, w.position[2]] as [number, number, number],
      ),
    ]
    return chain.slice(0, -1).map((from, i) => ({
      from,
      to: chain[i + 1],
      points: quadArcPoints(from, chain[i + 1], 0.55, 22),
      final: i === chain.length - 2,
    }))
  }, [waypoints])
  const stepColor = labAccents.locomotion.primary
  const destColor = xr.orb.confirmed.base
  const bloomColor = xr.orb.confirmed.halo

  return (
    <group>
      <LabHeading
        title={getLabTitle('locomotion')}
        subtitle={`${stickHand} stick · Move ${moveSpeedN.toFixed(1)} · ${turnMode} (${turnMode === 'snap' ? `${Math.round(snapDegN)}°` : `${Math.round(smoothDegN)}°/s`})`}
        archPosition={[0, 0, -12.2]}
      />
      <IfInSessionMode deny="immersive-ar">
        <SharedArch position={[0, 0, -12.2]} holo={<LocomotionHolo />} />
        <StagePlatform position={[0, 0, -12.2]} />
      </IfInSessionMode>
      <StartZone
        fill={xr.accent.stone}
        ring={labAccents.locomotion.secondary}
        seal={xr.accent.seal}
        isCloudPark={isCloudPark}
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

      {/* Numbered waypoints (theme-agnostic). Step 3 is the flagged destination. */}
      {waypoints.map((w) => (
        <NumberedWaypoint
          key={`waypoint-${w.step}`}
          position={w.position}
          step={w.step}
          final={w.final}
          stepColor={stepColor}
          destinationColor={destColor}
          bloomColor={bloomColor}
          textColor={xr.hud.textPrimary}
          textOutline={xr.void.clear}
          showBloom={!isCloudPark}
        />
      ))}

      {/* Dashed teleport arcs origin → W1 → W2 → W3. */}
      {arcSegments.map((seg, i) => (
        <Line
          key={`arc-${i}`}
          points={seg.points}
          color={seg.final ? destColor : stepColor}
          lineWidth={2.2}
          dashed
          dashSize={0.12}
          gapSize={0.09}
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      ))}

      {[-1.6, -3.4, -5.8, -8.3, -10.7].map((z) => (
        <PathChevron
          key={`chevron-${z}`}
          position={[0, 0.06, z]}
          stone={xr.accent.stone}
          glow={labAccents.locomotion.primary}
          isCloudPark={isCloudPark}
        />
      ))}

      {isCloudPark ? (
        <CloudParkLocomotionScenery
          stone={xr.accent.stone}
          ring={labAccents.locomotion.secondary}
          seal={labAccents.locomotion.primary}
        />
      ) : (
        <>
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
        </>
      )}

      <DestinationPortal
        stone={xr.accent.stone}
        glow={labAccents.locomotion.primary}
        seal={xr.accent.seal}
        isCloudPark={isCloudPark}
      />
      {!isCloudPark && (
        <>
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
        </>
      )}
      {isCloudPark ? (
        <CloudParkSideIsland
          position={[0, 0.02, -15.8]}
          scale={1.1}
          rimColor={labAccents.locomotion.primary}
        />
      ) : (
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
      )}
    </group>
  )
}
