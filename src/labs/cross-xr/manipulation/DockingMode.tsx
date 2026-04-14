import { Text } from '@react-three/drei'
import { useCallback, useMemo, useState } from 'react'
import { Euler, Quaternion, Vector3 } from 'three'
import type { ManipulationAcquisition, ManipulationTechnique } from '../ObjectManipulationLab'
import type { ManipulationResult } from './techniques'
import { tuningPresets } from '../../../config/labs'
import { usePlaygroundTheme } from '../../../xr/theme/PlaygroundThemeContext'
import {
  scalePlatformSimpleToWidth,
  scalePropComputerToHeight,
} from '../../../xr/visual/kitNative'
import { KitInstance } from '../../../xr/visual/useKitModel'
import { useHandJoints } from './useHandJoints'
import { useManipulation } from './useManipulation'
import { ManipulableObject } from './ManipulableObject'
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
const TABLE_SURFACE_BELOW_EYE_M = 0.57

function addYOffset(position: [number, number, number], offsetY: number): [number, number, number] {
  return [position[0], position[1] + offsetY, position[2]]
}

function DockingGhost({
  objectSize,
  primary,
  secondary,
}: {
  objectSize: number
  primary: string
  secondary: string
}) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[objectSize * 0.18, objectSize * 0.36, 8, 18]} />
        <meshStandardMaterial
          color={primary}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, objectSize * 0.42]}>
        <sphereGeometry args={[objectSize * 0.2, 18, 16]} />
        <meshStandardMaterial
          color={secondary}
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, objectSize * 0.28, -objectSize * 0.04]}>
        <cylinderGeometry args={[objectSize * 0.028, objectSize * 0.028, objectSize * 0.24, 12]} />
        <meshStandardMaterial
          color={secondary}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, objectSize * 0.42, -objectSize * 0.04]}>
        <sphereGeometry args={[objectSize * 0.09, 14, 12]} />
        <meshBasicMaterial color={secondary} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh position={[0, -objectSize * 0.24, -objectSize * 0.02]}>
        <boxGeometry args={[objectSize * 0.3, objectSize * 0.07, objectSize * 0.2]} />
        <meshBasicMaterial color={secondary} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0, -objectSize * 0.44]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[objectSize * 0.14, objectSize * 0.028, 8, 24]} />
        <meshBasicMaterial color={secondary} transparent opacity={0.46} depthWrite={false} />
      </mesh>
      <mesh position={[-objectSize * 0.26, -objectSize * 0.05, -objectSize * 0.08]}>
        <sphereGeometry args={[objectSize * 0.1, 14, 10]} />
        <meshBasicMaterial color={secondary} transparent opacity={0.42} depthWrite={false} />
      </mesh>
      <mesh position={[objectSize * 0.22, 0, -objectSize * 0.14]}>
        <boxGeometry args={[objectSize * 0.07, objectSize * 0.18, objectSize * 0.16]} />
        <meshBasicMaterial color={secondary} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      {[-1, 1].map((dir) => (
        <mesh
          key={`ghost-wing-${dir}`}
          position={[dir * objectSize * 0.1, 0, objectSize * 0.28]}
          rotation={[0, 0, dir * 0.42]}
        >
          <boxGeometry args={[objectSize * 0.08, objectSize * 0.16, objectSize * 0.03]} />
          <meshBasicMaterial color={secondary} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function DockingHeroObject({
  objectSize,
  baseColor,
  accentColor,
  active,
}: {
  objectSize: number
  baseColor: string
  accentColor: string
  active: boolean
}) {
  const accent = active ? accentColor : '#ef4444'

  return (
    <group>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[objectSize * 0.18, objectSize * 0.36, 8, 20]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.28}
          metalness={0.18}
          emissive={active ? accentColor : '#000000'}
          emissiveIntensity={active ? 0.05 : 0}
        />
      </mesh>
      <mesh position={[0, 0, objectSize * 0.42]} castShadow>
        <sphereGeometry args={[objectSize * 0.2, 24, 20]} />
        <meshStandardMaterial
          color="#efdeba"
          roughness={0.12}
          metalness={0.14}
          emissive={accent}
          emissiveIntensity={0.18}
        />
      </mesh>
      <mesh position={[0, objectSize * 0.28, -objectSize * 0.04]} castShadow>
        <cylinderGeometry args={[objectSize * 0.028, objectSize * 0.028, objectSize * 0.24, 12]} />
        <meshStandardMaterial color="#cac3b7" roughness={0.26} metalness={0.16} />
      </mesh>
      <mesh position={[0, objectSize * 0.42, -objectSize * 0.04]} castShadow>
        <sphereGeometry args={[objectSize * 0.09, 18, 16]} />
        <meshStandardMaterial
          color="#cceaf0"
          roughness={0.14}
          metalness={0.08}
          emissive={accentColor}
          emissiveIntensity={0.16}
        />
      </mesh>
      <mesh position={[0, -objectSize * 0.24, -objectSize * 0.02]} castShadow>
        <boxGeometry args={[objectSize * 0.3, objectSize * 0.07, objectSize * 0.2]} />
        <meshStandardMaterial
          color={accentColor}
          roughness={0.24}
          metalness={0.18}
          emissive={accentColor}
          emissiveIntensity={active ? 0.1 : 0.04}
        />
      </mesh>
      <mesh position={[0, 0, -objectSize * 0.44]} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[objectSize * 0.14, objectSize * 0.028, 10, 28]} />
        <meshStandardMaterial
          color="#cabfb1"
          roughness={0.22}
          metalness={0.14}
          emissive={accentColor}
          emissiveIntensity={active ? 0.08 : 0.02}
        />
      </mesh>
      <mesh position={[-objectSize * 0.26, -objectSize * 0.05, -objectSize * 0.08]} castShadow>
        <sphereGeometry args={[objectSize * 0.1, 18, 16]} />
        <meshStandardMaterial
          color={accentColor}
          roughness={0.2}
          metalness={0.12}
          emissive={accent}
          emissiveIntensity={active ? 0.12 : 0.06}
        />
      </mesh>
      <mesh position={[objectSize * 0.22, 0, -objectSize * 0.14]} castShadow>
        <boxGeometry args={[objectSize * 0.07, objectSize * 0.18, objectSize * 0.16]} />
        <meshStandardMaterial color="#bcb4a8" roughness={0.24} metalness={0.12} />
      </mesh>
      {[-1, 1].map((dir) => (
        <mesh
          key={`hero-wing-${dir}`}
          position={[dir * objectSize * 0.1, 0, objectSize * 0.28]}
          rotation={[0, 0, dir * 0.42]}
          castShadow
        >
          <boxGeometry args={[objectSize * 0.08, objectSize * 0.16, objectSize * 0.03]} />
          <meshStandardMaterial
            color={accent}
            roughness={0.24}
            metalness={0.14}
            emissive={accent}
            emissiveIntensity={0.18}
          />
        </mesh>
      ))}
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
}: {
  objectSize: number
  stone: string
  seal: string
  primary: string
  secondary: string
  offsetY: number
}) {
  return (
    <group>
      <mesh position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.34, OBJECT_ORIGIN.z + 0.04], offsetY)}>
        <boxGeometry args={[1.7, 0.12, 1.04]} />
        <meshStandardMaterial color={seal} roughness={0.96} emissive={seal} emissiveIntensity={0.05} />
      </mesh>
      <mesh position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.2, OBJECT_ORIGIN.z], offsetY)}>
        <boxGeometry args={[1.22, 0.08, 0.56]} />
        <meshStandardMaterial color={stone} roughness={0.88} />
      </mesh>
      {[-0.52, 0.52].map((x) => (
        <mesh
          key={`cradle-${x}`}
          position={addYOffset([OBJECT_ORIGIN.x + x, MIN_TARGET_Y - 0.08, OBJECT_ORIGIN.z + 0.02], offsetY)}
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
  const { labAccents, xr } = usePlaygroundTheme()
  const joints = useHandJoints('right')
  const tableOffsetY = useInitialEyeLevelOffset({
    referenceY: DESK_SURFACE_Y,
    eyeOffsetFromHead: -TABLE_SURFACE_BELOW_EYE_M,
  })
  const objectOrigin = useMemo(
    () => OBJECT_ORIGIN.clone().add(new Vector3(0, tableOffsetY, 0)),
    [tableOffsetY],
  )

  const trials = useMemo(() => generateTrials(), [])
  const [trialIndex, setTrialIndex] = useState(0)
  const [results, setResults] = useState<TrialResult[]>([])
  const [lastResult, setLastResult] = useState<TrialResult | null>(null)

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
      if (!currentTrial || !targetPosition) return

      const positionalOffset = result.position.distanceTo(targetPosition)
      const rotationalOffsetDeg = computeRotationalOffset(
        result.quaternion,
        currentTrial.targetQuaternion,
      )
      const trialResult: TrialResult = {
        trial: currentTrial,
        technique,
        positionalOffset,
        rotationalOffsetDeg,
      }
      setResults((prev) => [...prev, trialResult])
      setLastResult(trialResult)
      setTrialIndex((prev) => prev + 1)
    },
    [currentTrial, targetPosition, technique],
  )

  const { register, state, acquireById, releaseActive } = useManipulation({
    acquisition,
    technique,
    joints,
    cdGain,
    grabDistance,
    onRelease,
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
          color="#22c55e"
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

      {/* Target ghost */}
      <mesh
        position={targetPosition ?? currentTrial.targetPosition}
        quaternion={currentTrial.targetQuaternion}
      >
        <DockingGhost
          objectSize={objectSize}
          primary={labAccents.manipulation.primary}
          secondary={labAccents.manipulation.secondary}
        />
      </mesh>

      {/* Manipulable object */}
      <ManipulableObject
        id="docking-object"
        initialPosition={objectOrigin}
        hitHalfExtents={[
          objectSize * 0.66,
          objectSize * 0.5,
          objectSize * 0.72,
        ]}
        register={register}
        isActive={state.isManipulating}
        onPointerDown={acquisition === 'ray' ? () => acquireById('docking-object') : undefined}
        onPointerUp={acquisition === 'ray' ? () => releaseActive() : undefined}
      >
        <DockingHeroObject
          objectSize={objectSize}
          baseColor={state.isManipulating ? '#f1e6d8' : xr.accent.stone}
          accentColor={labAccents.manipulation.primary}
          active={state.isManipulating}
        />
      </ManipulableObject>

      <DockingStation
        objectSize={objectSize}
        stone={xr.accent.stone}
        seal={xr.accent.seal}
        primary={labAccents.manipulation.primary}
        secondary={labAccents.manipulation.secondary}
        offsetY={tableOffsetY}
      />
      <KitInstance
        name="platform_simple"
        position={addYOffset(
          [OBJECT_ORIGIN.x, DESK_SURFACE_Y - 0.004, OBJECT_ORIGIN.z + 0.18],
          tableOffsetY,
        )}
        scale={scalePlatformSimpleToWidth(1.45)}
        options={{
          color: xr.accent.stone,
          emissive: xr.accent.mustard,
          emissiveIntensity: 0.04,
          roughness: 0.88,
        }}
      />
      <KitInstance
        name="prop_computer"
        position={[-1.18, 0, -1.32]}
        scale={scalePropComputerToHeight(1.28)}
        rotation={[0, Math.PI * 0.22, 0]}
        options={{
          color: xr.accent.stone,
          emissive: labAccents.manipulation.secondary,
          emissiveIntensity: 0.16,
          roughness: 0.55,
        }}
      />
      <KitInstance
        name="prop_computer"
        position={[1.18, 0, -1.26]}
        scale={scalePropComputerToHeight(1.14)}
        rotation={[0, -Math.PI * 0.18, 0]}
        options={{
          color: xr.accent.stone,
          emissive: labAccents.manipulation.primary,
          emissiveIntensity: 0.14,
          roughness: 0.55,
        }}
      />
    </group>
  )
}
