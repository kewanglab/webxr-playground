import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Euler, Quaternion, Shape, Vector3 } from 'three'
import type { ManipulationAcquisition, ManipulationTechnique } from '../ObjectManipulationLab'
import type { ManipulationResult } from './techniques'
import { tuningPresets } from '../../../config/labs'
import { usePlaygroundTheme } from '../../../xr/theme/PlaygroundThemeContext'
import {
  scalePropComputerToHeight,
} from '../../../xr/visual/kitNative'
import { KitInstance } from '../../../xr/visual/useKitModel'
import {
  CloudParkShadowBlob,
  CloudParkSideIsland,
  CloudParkWorkbenchHandle,
  CloudParkWindLine,
  FloatingCloudMat,
} from '../../../xr/visual/CloudParkScenery'
import { useHandJoints } from './useHandJoints'
import { useManipulation } from './useManipulation'
import { ManipulableObject } from './ManipulableObject'
import { useHapticPulse } from '../../../xr/feedback/haptics/useHapticPulse'
import { useInitialEyeLevelOffset } from '../../../xr/core/useInitialEyeLevelOffset'

type DockingModeProps = {
  acquisition: ManipulationAcquisition
  technique: ManipulationTechnique
  objectSize: number
  grabDistance: number
  cdGain: number
}

type TrialType = 'translation' | 'rotation' | 'combined'

type Trial = {
  type: TrialType
  targetPosition: Vector3
  targetQuaternion: Quaternion
}

type TrialResult = {
  trial: Trial
  technique: ManipulationTechnique
  positionalOffset: number
  rotationalOffsetDeg: number
}

const OBJECT_ORIGIN = new Vector3(0, 1.2, -0.7)
const DEFAULTS = tuningPresets.manipulation
const MIN_TARGET_Y = OBJECT_ORIGIN.y - DEFAULTS.docking.translationOffsetM
const DESK_SURFACE_Y = MIN_TARGET_Y - 0.2 + 0.04
const TABLE_SURFACE_BELOW_EYE_M = 0.54
const DEFAULT_STANDING_EYE_HEIGHT_M = 1.66
const DESK_PLATFORM_WIDTH = 1.45
const DESK_PLATFORM_DEPTH = 0.78
const DESK_PLATFORM_THICKNESS = 0.06
const DEFAULT_TABLE_OFFSET_Y =
  DEFAULT_STANDING_EYE_HEIGHT_M - TABLE_SURFACE_BELOW_EYE_M - DESK_SURFACE_Y
const SIDE_CONSOLE_HEIGHT_M = 1.2
const SIDE_CONSOLE_GROUND_Y = 0.001

function addYOffset(position: [number, number, number], offsetY: number): [number, number, number] {
  return [position[0], position[1] + offsetY, position[2]]
}

/**
 * Key-crystal silhouette per design-handoff v0.2 Section 02 / 04 (manipulation · docking).
 * Shaft (rectangular prism) + notched pentagonal head + UP-indicator (dot for solid, arrow for ghost).
 * Characteristic height = `objectSize` (matches code's `tuningPresets.manipulation.objectSize` default).
 * Orientation convention: +Y is the key's "up" axis; head sits above the shaft along +Y.
 */
function KeyCrystal({
  objectSize,
  variant,
  solidColor,
  accentColor,
  ghostTint,
  active = false,
}: {
  objectSize: number
  variant: 'solid' | 'ghost'
  solidColor: string
  accentColor: string
  ghostTint?: string
  active?: boolean
}) {
  const shaftW = objectSize * 0.24
  const shaftD = objectSize * 0.12
  const shaftH = objectSize * 0.62
  const headH = objectSize * 0.38
  const headW = objectSize * 0.46
  const shaftCenterY = shaftH * 0.5 - objectSize * 0.5 // center the whole key on its local origin
  const headBaseY = shaftCenterY + shaftH * 0.5

  // Notched-pentagon head profile (half-width 0.5, height 1.0 — scaled via Shape extrusion).
  const headShape = useMemo(() => {
    const s = new Shape()
    s.moveTo(-0.5, 0)
    s.lineTo(-0.5, 0.55)
    s.lineTo(0, 1)
    s.lineTo(0.5, 0.55)
    s.lineTo(0.5, 0)
    s.closePath()
    return s
  }, [])
  const headDepth = shaftD * 1.05

  if (variant === 'ghost') {
    const tint = ghostTint ?? '#A8D4E0'
    return (
      <group>
        {/* Shaft wireframe. */}
        <mesh position={[0, shaftCenterY, 0]}>
          <boxGeometry args={[shaftW, shaftH, shaftD]} />
          <meshBasicMaterial
            color={tint}
            wireframe
            transparent
            opacity={0.95}
            depthWrite={false}
          />
        </mesh>
        {/* Head wireframe (pentagonal extrude). */}
        <mesh
          position={[0, headBaseY, 0]}
          scale={[headW, headH, headDepth]}
        >
          <extrudeGeometry args={[headShape, { depth: 1, bevelEnabled: false }]} />
          <meshBasicMaterial
            color={tint}
            wireframe
            transparent
            opacity={0.95}
            depthWrite={false}
          />
        </mesh>
        {/* Centered UP arrow inside head — shows required orientation. */}
        <group position={[0, headBaseY + headH * 0.5, headDepth * 0.55]}>
          {/* Arrow stem. */}
          <mesh position={[0, -headH * 0.12, 0]}>
            <boxGeometry args={[headH * 0.08, headH * 0.48, 0.002]} />
            <meshBasicMaterial color={tint} transparent opacity={0.95} depthWrite={false} />
          </mesh>
          {/* Arrow tip (triangle via cone, 3 radial segments). */}
          <mesh position={[0, headH * 0.18, 0]}>
            <coneGeometry args={[headH * 0.18, headH * 0.22, 3]} />
            <meshBasicMaterial color={tint} transparent opacity={0.95} depthWrite={false} />
          </mesh>
        </group>
      </group>
    )
  }

  const emissiveI = active ? 0.4 : 0.18
  return (
    <group>
      {/* Shaft. */}
      <mesh position={[0, shaftCenterY, 0]}>
        <boxGeometry args={[shaftW, shaftH, shaftD]} />
        <meshStandardMaterial
          color={solidColor}
          emissive={solidColor}
          emissiveIntensity={emissiveI}
          roughness={0.32}
          metalness={0.12}
        />
      </mesh>
      {/* Pentagonal notched head. */}
      <mesh
        position={[0, headBaseY, 0]}
        scale={[headW, headH, headDepth]}
      >
        <extrudeGeometry args={[headShape, { depth: 1, bevelEnabled: false }]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={emissiveI + 0.08}
          roughness={0.24}
          metalness={0.18}
        />
      </mesh>
      {/* UP indicator dot — bright cream sphere embedded in head. */}
      <mesh position={[0, headBaseY + headH * 0.55, headDepth * 0.55]}>
        <sphereGeometry args={[objectSize * 0.04, 14, 10]} />
        <meshBasicMaterial color="#FFFAEE" />
      </mesh>
    </group>
  )
}

/**
 * Dashed proximity ring (flat on XZ plane) that appears when the tracked hand enters grab range.
 * True dashed rendering requires shader/line2; approximated here with a set of short arc segments.
 */
function ProximityRing({
  visible,
  radius,
  tint,
}: {
  visible: boolean
  radius: number
  tint: string
}) {
  if (!visible) return null
  const segmentCount = 20
  const segmentSpan = (Math.PI * 2) / segmentCount
  const dashFraction = 0.55
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: segmentCount }).map((_, i) => {
        const a0 = i * segmentSpan
        const a1 = a0 + segmentSpan * dashFraction
        const midA = (a0 + a1) * 0.5
        const midX = Math.cos(midA) * radius
        const midY = Math.sin(midA) * radius
        return (
          <mesh key={i} position={[midX, midY, 0]} rotation={[0, 0, midA + Math.PI / 2]}>
            <planeGeometry args={[radius * 0.11, 0.004]} />
            <meshBasicMaterial color={tint} transparent opacity={0.8} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}

function DockingStation({
  objectSize,
  stone,
  seal,
  primary,
  secondary,
  offsetY,
  isCloudPark,
}: {
  objectSize: number
  stone: string
  seal: string
  primary: string
  secondary: string
  offsetY: number
  isCloudPark: boolean
}) {
  if (isCloudPark) {
    return (
      <group>
        <FloatingCloudMat
          position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.36, OBJECT_ORIGIN.z - 0.02], offsetY)}
          scale={0.98}
          cloudColor={stone}
          shadeColor="#DFF4E6"
          rimColor={secondary}
        />
        <CloudParkShadowBlob
          position={addYOffset([OBJECT_ORIGIN.x, DESK_SURFACE_Y - 0.01, OBJECT_ORIGIN.z + 0.04], offsetY)}
          scale={[1.82, 1, 1.02]}
          color={primary}
          opacity={0.11}
        />
        <mesh
          position={addYOffset(
            [OBJECT_ORIGIN.x, DESK_SURFACE_Y - DESK_PLATFORM_THICKNESS / 2, OBJECT_ORIGIN.z + 0.04],
            offsetY,
          )}
          scale={[1.28, 1, 0.68]}
        >
          <cylinderGeometry args={[0.58, 0.68, DESK_PLATFORM_THICKNESS, 32]} />
          <meshStandardMaterial color={stone} roughness={0.86} metalness={0.02} />
        </mesh>
        {[-0.46, 0.46].map((x) => (
          <mesh
            key={`cloud-table-support-${x}`}
            position={addYOffset([OBJECT_ORIGIN.x + x, MIN_TARGET_Y - 0.165, OBJECT_ORIGIN.z - 0.02], offsetY)}
          >
            <capsuleGeometry args={[0.045, 0.18, 7, 12]} />
            <meshStandardMaterial color={stone} roughness={0.9} emissive={secondary} emissiveIntensity={0.025} />
          </mesh>
        ))}
        <mesh
          position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.05, OBJECT_ORIGIN.z - 0.23], offsetY)}
          rotation={[0, 0, Math.PI / 2]}
        >
          <capsuleGeometry args={[0.022, 0.54, 7, 18]} />
          <meshStandardMaterial
            color={secondary}
            roughness={0.58}
            emissive={secondary}
            emissiveIntensity={0.12}
          />
        </mesh>
        <mesh position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.025, OBJECT_ORIGIN.z - 0.12], offsetY)}>
          <torusGeometry args={[0.48, 0.014, 8, 32]} />
          <meshBasicMaterial color={primary} transparent opacity={0.46} depthWrite={false} />
        </mesh>
        <CloudParkWindLine
          position={addYOffset([OBJECT_ORIGIN.x - 0.6, DESK_SURFACE_Y + 0.18, OBJECT_ORIGIN.z + 0.22], offsetY)}
          rotation={[0, 0, 0.16]}
          length={0.7}
          color={primary}
          opacity={0.3}
        />
      </group>
    )
  }

  return (
    <group>
      <mesh position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.34, OBJECT_ORIGIN.z - 0.06], offsetY)}>
        <boxGeometry args={[1.7, 0.12, 0.86]} />
        <meshStandardMaterial color={seal} roughness={0.96} emissive={seal} emissiveIntensity={0.05} />
      </mesh>
      <mesh position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.23, OBJECT_ORIGIN.z - 0.1], offsetY)}>
        <boxGeometry args={[1.18, 0.1, 0.4]} />
        <meshStandardMaterial color={stone} roughness={0.88} />
      </mesh>
      <mesh
        position={addYOffset(
          [OBJECT_ORIGIN.x, DESK_SURFACE_Y - DESK_PLATFORM_THICKNESS / 2, OBJECT_ORIGIN.z + 0.04],
          offsetY,
        )}
      >
        <boxGeometry args={[DESK_PLATFORM_WIDTH, DESK_PLATFORM_THICKNESS, DESK_PLATFORM_DEPTH]} />
        <meshStandardMaterial color={stone} roughness={0.82} metalness={0.08} />
      </mesh>
      {[-0.42, 0, 0.42].map((x) => (
        <mesh
          key={`table-support-${x}`}
          position={addYOffset([OBJECT_ORIGIN.x + x, MIN_TARGET_Y - 0.175, OBJECT_ORIGIN.z - 0.02], offsetY)}
        >
          <boxGeometry args={[0.08, 0.18, 0.12]} />
          <meshStandardMaterial color={stone} roughness={0.86} />
        </mesh>
      ))}
      {[-0.52, 0.52].map((x) => (
        <mesh
          key={`cradle-${x}`}
          position={addYOffset([OBJECT_ORIGIN.x + x, MIN_TARGET_Y - 0.08, OBJECT_ORIGIN.z - 0.04], offsetY)}
        >
          <boxGeometry args={[0.1, 0.22, 0.32]} />
          <meshStandardMaterial color={stone} roughness={0.84} />
        </mesh>
      ))}
      <mesh position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.06, OBJECT_ORIGIN.z - 0.22], offsetY)}>
        <boxGeometry args={[0.68, 0.06, 0.12]} />
        <meshStandardMaterial
          color={secondary}
          roughness={0.5}
          emissive={secondary}
          emissiveIntensity={0.1}
        />
      </mesh>
      <mesh position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.03, OBJECT_ORIGIN.z - 0.12], offsetY)}>
        <torusGeometry args={[0.48, 0.014, 8, 32]} />
        <meshBasicMaterial color={primary} transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </group>
  )
}

function CloudParkDockingScenery({
  stone,
  primary,
  secondary,
}: {
  stone: string
  primary: string
  secondary: string
}) {
  return (
    <group>
      <CloudParkSideIsland position={[-1.32, 0.02, -1.32]} scale={0.54} rimColor={secondary} />
      <CloudParkSideIsland position={[1.28, 0.02, -1.28]} scale={0.5} rimColor={primary} />
      {[-1, 1].map((dir) => (
        <group key={`cloud-docking-panel-${dir}`} position={[dir * 1.12, 0.92, -1.18]} rotation={[0, -dir * 0.24, 0]}>
          <mesh>
            <planeGeometry args={[0.36, 0.28]} />
            <meshBasicMaterial color={stone} transparent opacity={0.58} depthWrite={false} />
          </mesh>
          <mesh position={[0, -0.01, 0.012]}>
            <ringGeometry args={[0.07, 0.105, 24]} />
            <meshBasicMaterial color={dir < 0 ? primary : secondary} transparent opacity={0.5} />
          </mesh>
          <CloudParkWindLine
            position={[0, 0.18, 0.02]}
            rotation={[0, 0, dir * 0.12]}
            length={0.32}
            color={dir < 0 ? primary : secondary}
            opacity={0.28}
          />
        </group>
      ))}
    </group>
  )
}

function generateTrials(): Trial[] {
  const { translationOffsetM, rotationOffsetDeg } = DEFAULTS.docking
  const trials: Trial[] = []
  const axes: [number, number, number][] = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
  const signs = [1, -1]

  for (const axis of axes) {
    for (const sign of signs) {
      trials.push({
        type: 'translation',
        targetPosition: new Vector3(
          OBJECT_ORIGIN.x + axis[0] * translationOffsetM * sign,
          OBJECT_ORIGIN.y + axis[1] * translationOffsetM * sign,
          OBJECT_ORIGIN.z + axis[2] * translationOffsetM * sign,
        ),
        targetQuaternion: new Quaternion(),
      })
    }
  }

  const rotRad = (rotationOffsetDeg * Math.PI) / 180
  for (const [i, axis] of axes.entries()) {
    for (const sign of signs) {
      const euler = new Euler(
        i === 0 ? rotRad * sign : 0,
        i === 1 ? rotRad * sign : 0,
        i === 2 ? rotRad * sign : 0,
      )
      trials.push({
        type: 'rotation',
        targetPosition: OBJECT_ORIGIN.clone(),
        targetQuaternion: new Quaternion().setFromEuler(euler),
      })
    }
  }

  for (const sign of signs) {
    for (const [i, axis] of axes.entries()) {
      const euler = new Euler(
        i === 0 ? rotRad * sign : 0,
        i === 1 ? rotRad * sign : 0,
        i === 2 ? rotRad * sign : 0,
      )
      trials.push({
        type: 'combined',
        targetPosition: new Vector3(
          OBJECT_ORIGIN.x + translationOffsetM * sign,
          OBJECT_ORIGIN.y,
          OBJECT_ORIGIN.z,
        ),
        targetQuaternion: new Quaternion().setFromEuler(euler),
      })
    }
  }

  return trials
}

function computeRotationalOffset(a: Quaternion, b: Quaternion): number {
  const dot = Math.abs(a.dot(b))
  const angleRad = 2 * Math.acos(Math.min(dot, 1))
  return (angleRad * 180) / Math.PI
}

export function DockingMode({
  acquisition,
  technique,
  objectSize,
  grabDistance,
  cdGain,
}: DockingModeProps) {
  const preset = usePlaygroundTheme()
  const { labAccents, xr, shell } = preset
  const isCloudPark = preset.id === 'cloud-park'
  const joints = useHandJoints('right')
  const baseTableOffsetY = useInitialEyeLevelOffset({
    referenceY: DESK_SURFACE_Y,
    eyeOffsetFromHead: -TABLE_SURFACE_BELOW_EYE_M,
    desktopOffsetY: DEFAULT_TABLE_OFFSET_Y,
  })
  const [manualTableLiftY, setManualTableLiftY] = useState(0)
  const tableOffsetY = baseTableOffsetY + manualTableLiftY
  const objectOrigin = useMemo(
    () => OBJECT_ORIGIN.clone().add(new Vector3(0, tableOffsetY, 0)),
    [tableOffsetY],
  )
  const tableHandleAnchor = useMemo(
    () =>
      new Vector3(
        OBJECT_ORIGIN.x + 0.58,
        DESK_SURFACE_Y + baseTableOffsetY + 0.08,
        OBJECT_ORIGIN.z + DESK_PLATFORM_DEPTH * 0.5 + 0.01,
      ),
    [baseTableOffsetY],
  )

  const trials = useMemo(() => generateTrials(), [])
  const [trialIndex, setTrialIndex] = useState(0)
  const [results, setResults] = useState<TrialResult[]>([])
  const [lastResult, setLastResult] = useState<TrialResult | null>(null)
  const pulseHaptic = useHapticPulse()
  const [handProximate, setHandProximate] = useState(false)

  const currentTrial = trials[trialIndex] ?? null
  const isComplete = trialIndex >= trials.length
  const targetPosition = useMemo(
    () =>
      currentTrial
        ? currentTrial.targetPosition.clone().add(new Vector3(0, tableOffsetY, 0))
        : null,
    [currentTrial, tableOffsetY],
  )

  const onRelease = useCallback(
    (id: string, result: ManipulationResult) => {
      if (id !== 'docking-object') return
      if (!currentTrial || !targetPosition) return

      const positionalOffset = result.position.distanceTo(targetPosition)
      const rotationalOffsetDeg = computeRotationalOffset(
        result.quaternion,
        currentTrial.targetQuaternion,
      )
      // Design-handoff v0.2 Section 04: auto-snap on release when within tight tolerance.
      const withinSnap =
        positionalOffset <= DEFAULTS.docking.snapToleranceM &&
        rotationalOffsetDeg <= DEFAULTS.docking.snapToleranceDeg
      if (withinSnap) {
        // Force the object's internal state to the exact target pose so the next
        // frame renders it locked-in. (Animated ease-out-back lerp is Phase 8 polish.)
        result.position.copy(targetPosition)
        result.quaternion.copy(currentTrial.targetQuaternion)
        // 30 ms success haptic burst per spec.
        pulseHaptic('right', 0.7, 30)
      }
      const trialResult: TrialResult = {
        trial: currentTrial,
        technique,
        positionalOffset: withinSnap ? 0 : positionalOffset,
        rotationalOffsetDeg: withinSnap ? 0 : rotationalOffsetDeg,
      }
      setResults((prev) => [...prev, trialResult])
      setLastResult(trialResult)
      setTrialIndex((prev) => prev + 1)
    },
    [currentTrial, pulseHaptic, targetPosition, technique],
  )

  const { register, state, acquireById, releaseActive } = useManipulation({
    acquisition,
    technique,
    joints,
    cdGain,
    grabDistance,
    onRelease,
  })

  // Proximity ring: show a dashed ring on the docking object when the tracked hand
  // comes within ~2× grabDistance of the object (hint zone).
  const objectOriginRef = useRef(new Vector3())
  objectOriginRef.current.copy(objectOrigin)
  useFrame(() => {
    if (!joints.isTracking) {
      if (handProximate) setHandProximate(false)
      return
    }
    const dist = joints.thumbTipPosition.distanceTo(objectOriginRef.current)
    const proximate = dist < grabDistance * 2
    if (proximate !== handProximate) setHandProximate(proximate)
  })

  if (isComplete) {
    const avgPos =
      results.reduce((sum, r) => sum + r.positionalOffset, 0) / results.length
    const avgRot =
      results.reduce((sum, r) => sum + r.rotationalOffsetDeg, 0) / results.length

    return (
      <group>
        <Text
          position={[0, 1.4, -1]}
          fontSize={0.1}
          color={shell.state.success}
          anchorX="center"
          anchorY="middle"
        >
          {`All ${results.length} trials complete!`}
        </Text>
        <Text
          position={[0, 1.25, -1]}
          fontSize={0.07}
          color={xr.hud.textMuted}
          anchorX="center"
          anchorY="middle"
        >
          {`Avg position offset: ${(avgPos * 100).toFixed(1)}cm | Avg rotation offset: ${avgRot.toFixed(1)}°`}
        </Text>
      </group>
    )
  }

  return (
    <group>
      <Text
        position={[0.4, 1.6 + tableOffsetY, -0.7]}
        fontSize={0.05}
        color={xr.hud.textMuted}
        anchorX="left"
        anchorY="middle"
      >
        {`Trial ${trialIndex + 1}/${trials.length} — ${currentTrial.type}`}
      </Text>

      {lastResult && (
        <Text
          position={[0.4, 1.53 + tableOffsetY, -0.7]}
          fontSize={0.04}
          color={xr.accent.stone}
          anchorX="left"
          anchorY="middle"
        >
          {`Last: ${(lastResult.positionalOffset * 100).toFixed(1)}cm / ${lastResult.rotationalOffsetDeg.toFixed(1)}°`}
        </Text>
      )}

      {/* Target ghost — upright key crystal at dock, with UP arrow visible. */}
      <group
        position={targetPosition ?? currentTrial.targetPosition}
        quaternion={currentTrial.targetQuaternion}
      >
        <KeyCrystal
          objectSize={objectSize}
          variant="ghost"
          solidColor={labAccents.manipulation.primary}
          accentColor={labAccents.manipulation.secondary}
          ghostTint={xr.affordance.dockActive}
        />
      </group>

      {/* Manipulable key crystal + proximity ring hint. */}
      <ManipulableObject
        id="docking-object"
        initialPosition={objectOrigin}
        hitHalfExtents={[
          objectSize * 0.3,
          objectSize * 0.55,
          objectSize * 0.2,
        ]}
        register={register}
        isActive={state.isManipulating && state.targetId === 'docking-object'}
        onPointerDown={acquisition === 'ray' ? () => acquireById('docking-object') : undefined}
        onPointerUp={acquisition === 'ray' ? () => releaseActive() : undefined}
      >
        <KeyCrystal
          objectSize={objectSize}
          variant="solid"
          solidColor={labAccents.manipulation.primary}
          accentColor={labAccents.manipulation.secondary}
          active={state.isManipulating}
        />
        {/* Proximity ring: 0.24 m radius dashed ring on the XZ plane through the key's midpoint
            (spec Section 04). */}
        <ProximityRing
          visible={handProximate && !state.isManipulating}
          radius={0.24}
          tint={xr.affordance.proximityRing}
        />
      </ManipulableObject>

      <ManipulableObject
        id="table-height-handle"
        initialPosition={[
          tableHandleAnchor.x,
          tableHandleAnchor.y + manualTableLiftY,
          tableHandleAnchor.z,
        ]}
        hitHalfExtents={[0.08, 0.16, 0.08]}
        register={register}
        constrainResult={(result) => {
          return {
            position: new Vector3(tableHandleAnchor.x, result.position.y, tableHandleAnchor.z),
            quaternion: new Quaternion(),
          }
        }}
        onUpdate={(result) => {
          const nextLift = result.position.y - tableHandleAnchor.y
          setManualTableLiftY((prev) =>
            Math.abs(prev - nextLift) > 0.002 ? nextLift : prev,
          )
        }}
        isActive={state.isManipulating && state.targetId === 'table-height-handle'}
        onPointerDown={
          acquisition === 'ray' ? () => acquireById('table-height-handle') : undefined
        }
        onPointerUp={acquisition === 'ray' ? () => releaseActive() : undefined}
      >
        {isCloudPark ? (
          <CloudParkWorkbenchHandle
            active={state.targetId === 'table-height-handle'}
            stone={xr.accent.stone}
            primary={labAccents.manipulation.primary}
            secondary={labAccents.manipulation.secondary}
          />
        ) : (
          <group>
            <mesh
              position={[
                0,
                -0.105,
                0,
              ]}
            >
              <cylinderGeometry args={[0.018, 0.022, 0.14, 14]} />
              <meshStandardMaterial color={xr.accent.stone} roughness={0.48} metalness={0.14} />
            </mesh>
            <mesh position={[0, 0.02, 0]}>
              <sphereGeometry args={[0.055, 18, 16]} />
              <meshStandardMaterial
                color={state.targetId === 'table-height-handle' ? labAccents.manipulation.primary : '#ece2d1'}
                roughness={0.22}
                metalness={0.12}
                emissive={labAccents.manipulation.primary}
                emissiveIntensity={state.targetId === 'table-height-handle' ? 0.18 : 0.05}
              />
            </mesh>
          </group>
        )}
      </ManipulableObject>

      <Text
        position={[
          tableHandleAnchor.x,
          DESK_SURFACE_Y + tableOffsetY + 0.04,
          OBJECT_ORIGIN.z + DESK_PLATFORM_DEPTH * 0.5 + 0.05,
        ]}
        fontSize={0.026}
        color="#f3ead9"
        outlineWidth={0.004}
        outlineColor="#594f43"
        anchorX="center"
        anchorY="middle"
      >
        {isCloudPark ? 'Bench lift' : 'Desk height'}
      </Text>

      <DockingStation
        objectSize={objectSize}
        stone={xr.accent.stone}
        seal={xr.accent.seal}
        primary={labAccents.manipulation.primary}
        secondary={labAccents.manipulation.secondary}
        offsetY={tableOffsetY}
        isCloudPark={isCloudPark}
      />
      {isCloudPark ? (
        <CloudParkDockingScenery
          stone={xr.accent.stone}
          primary={labAccents.manipulation.primary}
          secondary={labAccents.manipulation.secondary}
        />
      ) : (
        <>
          <KitInstance
            name="platform_simple"
            position={addYOffset(
              [OBJECT_ORIGIN.x, DESK_SURFACE_Y + 0.002, OBJECT_ORIGIN.z + 0.04],
              tableOffsetY,
            )}
            scale={[DESK_PLATFORM_WIDTH / 4, 1, DESK_PLATFORM_DEPTH / 4]}
            options={{
              color: xr.accent.stone,
              emissive: xr.accent.mustard,
              emissiveIntensity: 0.04,
              roughness: 0.88,
            }}
          />
          <KitInstance
            name="prop_computer"
            position={[-1.18, SIDE_CONSOLE_GROUND_Y, -1.32]}
            scale={scalePropComputerToHeight(SIDE_CONSOLE_HEIGHT_M)}
            rotation={[0, Math.PI * 0.22, 0]}
            options={{
              color: xr.accent.stone,
              emissive: xr.accent.amber,
              emissiveIntensity: 0.1,
              roughness: 0.55,
            }}
          />
          <KitInstance
            name="prop_computer"
            position={[1.18, SIDE_CONSOLE_GROUND_Y, -1.26]}
            scale={scalePropComputerToHeight(SIDE_CONSOLE_HEIGHT_M)}
            rotation={[0, -Math.PI * 0.18, 0]}
            options={{
              color: xr.accent.stone,
              emissive: xr.accent.amber,
              emissiveIntensity: 0.1,
              roughness: 0.55,
            }}
          />
        </>
      )}
    </group>
  )
}
