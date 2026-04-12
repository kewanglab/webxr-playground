import { Text } from '@react-three/drei'
import { useCallback, useMemo, useState } from 'react'
import { Euler, Quaternion, Vector3 } from 'three'
import type { ManipulationAcquisition, ManipulationTechnique } from '../ObjectManipulationLab'
import type { ManipulationResult } from './techniques'
import { tuningPresets } from '../../../config/labs'
import { usePlaygroundTheme } from '../../../xr/theme/PlaygroundThemeContext'
import { useHandJoints } from './useHandJoints'
import { useManipulation } from './useManipulation'
import { ManipulableObject } from './ManipulableObject'

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

  const trials = useMemo(() => generateTrials(), [])
  const [trialIndex, setTrialIndex] = useState(0)
  const [results, setResults] = useState<TrialResult[]>([])
  const [lastResult, setLastResult] = useState<TrialResult | null>(null)

  const currentTrial = trials[trialIndex] ?? null
  const isComplete = trialIndex >= trials.length

  const onRelease = useCallback(
    (id: string, result: ManipulationResult) => {
      if (!currentTrial) return

      const positionalOffset = result.position.distanceTo(currentTrial.targetPosition)
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
    [currentTrial, technique],
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
        position={[0.4, 1.6, -0.7]}
        fontSize={0.05}
        color={xr.hud.textMuted}
        anchorX="left"
        anchorY="middle"
      >
        {`Trial ${trialIndex + 1}/${trials.length} — ${currentTrial.type}`}
      </Text>

      {lastResult && (
        <Text
          position={[0.4, 1.53, -0.7]}
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
        position={currentTrial.targetPosition}
        quaternion={currentTrial.targetQuaternion}
      >
        <boxGeometry args={[objectSize, objectSize, objectSize]} />
        <meshStandardMaterial
          color={labAccents.manipulation.primary}
          transparent
          opacity={0.3}
        />
      </mesh>
      {/* Asymmetric marker on target ghost to show rotation */}
      <mesh
        position={new Vector3(0, objectSize * 0.3, objectSize * 0.5 + 0.001)
          .applyQuaternion(currentTrial.targetQuaternion)
          .add(currentTrial.targetPosition)}
        quaternion={currentTrial.targetQuaternion}
      >
        <planeGeometry args={[objectSize * 0.3, objectSize * 0.3]} />
        <meshBasicMaterial
          color={labAccents.manipulation.secondary}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Manipulable object */}
      <ManipulableObject
        id="docking-object"
        initialPosition={OBJECT_ORIGIN}
        hitHalfExtents={[
          objectSize / 2,
          objectSize / 2,
          objectSize / 2,
        ]}
        register={register}
        isActive={state.isManipulating}
        onPointerDown={acquisition === 'ray' ? () => acquireById('docking-object') : undefined}
        onPointerUp={acquisition === 'ray' ? () => releaseActive() : undefined}
      >
        <mesh>
          <boxGeometry args={[objectSize, objectSize, objectSize]} />
          <meshStandardMaterial
            color={
              state.isManipulating
                ? labAccents.manipulation.primary
                : xr.accent.stone
            }
          />
        </mesh>
        {/* Asymmetric marker to show rotation */}
        <mesh position={[0, objectSize * 0.3, objectSize * 0.5 + 0.001]}>
          <planeGeometry args={[objectSize * 0.3, objectSize * 0.3]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </ManipulableObject>

    </group>
  )
}
