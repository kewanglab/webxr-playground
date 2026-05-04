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
import type { Tinted } from '../../config/playgroundTheme'
import { usePlaygroundTheme } from '../../xr/theme/PlaygroundThemeContext'
import { LocomotionHolo } from '../../xr/visual/holos'
import { SharedArch, StagePlatform } from '../../xr/visual/SharedScenery'

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
  bloomColor: Tinted
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
            color={bloomColor.color}
            transparent
            opacity={bloomColor.opacity}
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
  ring,
  seal,
}: {
  ring: string
  seal: string
}) {
  // Both themes use the same patina-style stage: a darker disc + a brighter
  // emissive rim. Tokens (seal / ring) come from the active theme, so the
  // park theme picks up its own palette automatically.
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
    </group>
  )
}

function DestinationPortal({
  glow,
  seal,
}: {
  glow: string
  seal: string
}) {
  // Both themes share the patina-style destination platform: inner disc + ring.
  // Tokens come from the active theme so the park theme picks up its own
  // palette without needing a separate cloud-mat variant.
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
      // Step 3 sits on top of the destination platform (z = -11.5 in both
      // themes — see `DestinationPortal`).
      { position: [0, 0, -11.5], step: 3, final: true },
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
  // Per-theme contrast override. Park theme's default
  // `labAccents.locomotion.primary` (cyan) sits too close to the bright
  // green ground tone, so swap to `xr.accent.orange` (#E76456) — warm
  // against cool gives strong contrast for both the path arcs and the
  // destination flag. Warm-night keeps its existing primary token since
  // it already contrasts well against the dark patina floor.
  // Flag and path arcs share `stepColor` so the line of travel reads as
  // one continuous color leading to the destination marker.
  const stepColor = isCloudPark ? xr.accent.orange : labAccents.locomotion.primary
  const destColor = stepColor
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
        ring={labAccents.locomotion.secondary}
        // Park theme `xr.accent.seal` is dark teal — too dim for the bright
        // park stage. Swap to `xr.accent.stone` (cream) so the disc reads as
        // a paved stage in the park; warm-night keeps its dark patina disc.
        seal={isCloudPark ? xr.accent.stone : xr.accent.seal}
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

      {/* Side walls flanking the path — same patina structure for both
          themes; tokens come from the active palette. */}
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

      <DestinationPortal
        glow={stepColor}
        // Same per-theme swap as StartZone: cream stage in CP, dark patina in WN.
        seal={isCloudPark ? xr.accent.stone : xr.accent.seal}
      />
      {/* Outer destination platform: a wider, softer stage around the inner
          DestinationPortal disc. Identical structure for both themes. */}
      <mesh position={[0, 0.018, -11.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.04, 40]} />
        <meshStandardMaterial
          color={isCloudPark ? xr.accent.stone : xr.accent.seal}
          roughness={0.94}
          emissive={labAccents.locomotion.secondary}
          emissiveIntensity={0.06}
        />
      </mesh>
      <mesh position={[0, 0.028, -11.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.92, 40]} />
        <meshStandardMaterial
          color={stepColor}
          roughness={0.58}
          emissive={stepColor}
          emissiveIntensity={0.18}
        />
      </mesh>
    </group>
  )
}
