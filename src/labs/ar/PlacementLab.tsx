import { Text } from '@react-three/drei'
import {
  IfInSessionMode,
  XRHitTest,
  useXRInputSourceState,
} from '@react-three/xr'
import { useControls } from 'leva'
import { stepperNumber } from '../../ui/levaPlugins/stepperNumber'
import { useMemo, useRef, useState } from 'react'
import { Matrix4, Quaternion, Vector3, type Mesh } from 'three'
import { useHapticPulse } from '../../xr/feedback/haptics/useHapticPulse'
import { useConfirmTone } from '../../xr/feedback/audio/useConfirmTone'
import { getLabTitle, tuningPresets } from '../../config/labs'
import { LabHeading } from '../LabHeading'
import { readLevaNumber } from '../../ui/levaPlugins/readLevaNumber'
import { usePlaygroundTheme } from '../../xr/theme/PlaygroundThemeContext'

export function PlacementLab() {
  const { labAccents, xr } = usePlaygroundTheme()
  const defaults = tuningPresets.controller.placement
  const { objectSize, previewOpacity, enableHaptics, enableAudio } = useControls('Placement', {
    objectSize: stepperNumber({
      value: defaults.objectSize,
      min: 0.05,
      max: 0.3,
      step: 0.01,
    }),
    previewOpacity: stepperNumber({
      value: defaults.previewOpacity,
      min: 0,
      max: 1,
      step: 0.05,
    }),
    enableHaptics: defaults.enableHaptics,
    enableAudio: defaults.enableAudio,
  })

  type Placed = {
    id: string
    position: Vector3
    quaternion: Quaternion
    source: 'ray' | 'pinch'
  }

  const [placed, setPlaced] = useState<Placed[]>([])

  const objSize = readLevaNumber(objectSize, defaults.objectSize)
  const previewOp = readLevaNumber(previewOpacity, defaults.previewOpacity)

  return (
    <group>
      <LabHeading
        title={getLabTitle('placement')}
        subtitle={`Object ${objSize.toFixed(2)} · Preview ${previewOp.toFixed(2)} · Haptics ${enableHaptics ? 'on' : 'off'} · Audio ${enableAudio ? 'on' : 'off'}`}
      />

      <IfInSessionMode allow="immersive-ar">
        <group>
          <PlacementPreview
            color={labAccents.placement.primary}
            opacity={previewOpacity}
            onPlace={(transform) => {
              setPlaced((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  position: transform.position.clone(),
                  quaternion: transform.quaternion.clone(),
                  source: 'ray',
                },
              ])
            }}
            objectSize={objSize}
            mode="controller"
            enableHaptics={enableHaptics}
            enableAudio={enableAudio}
          />

          <PlacementPreview
            color={labAccents.placement.secondary}
            opacity={previewOpacity}
            onPlace={(transform) => {
              setPlaced((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  position: transform.position.clone(),
                  quaternion: transform.quaternion.clone(),
                  source: 'pinch',
                },
              ])
            }}
            objectSize={objSize}
            mode="hand"
            enableHaptics={enableHaptics}
            enableAudio={enableAudio}
          />

          {placed.map((p) => (
            <mesh key={p.id} position={p.position} quaternion={p.quaternion}>
              <boxGeometry args={[objSize, objSize, objSize]} />
              <meshStandardMaterial
                color={
                  p.source === 'ray'
                    ? labAccents.placement.primary
                    : labAccents.placement.secondary
                }
              />
            </mesh>
          ))}
        </group>
      </IfInSessionMode>

      {!placed.length && (
        <Text
          position={[0, 1.15, -2]}
          fontSize={0.12}
          color={xr.hud.textMuted}
          anchorX="center"
          anchorY="middle"
        >
          Enter AR to preview placement (controller vs pinch colors follow theme)
        </Text>
      )}
    </group>
  )
}

function PlacementPreview({
  color,
  opacity,
  onPlace,
  objectSize,
  mode,
  enableHaptics,
  enableAudio,
}: {
  color: string
  opacity: number
  objectSize: number
  mode: 'controller' | 'hand'
  enableHaptics: boolean
  enableAudio: boolean
  onPlace: (transform: { position: Vector3; quaternion: Quaternion }) => void
}) {
  const previewRef = useRef<Mesh>(null)
  const matrixHelper = useMemo(() => new Matrix4(), [])
  const pos = useMemo(() => new Vector3(), [])
  const quat = useMemo(() => new Quaternion(), [])

  const controllerState = useXRInputSourceState('controller', 'right')
  const handState = useXRInputSourceState('hand', 'right')
  const pulse = useHapticPulse()
  const playTone = useConfirmTone()

  const activeSpace =
    mode === 'controller'
      ? controllerState?.inputSource.targetRaySpace
      : handState?.inputSource.targetRaySpace

  return (
    <group>
      <mesh
        ref={previewRef}
        visible={false}
        onPointerDown={() => {
          const m = previewRef.current
          if (!m) return
          onPlace({ position: m.position, quaternion: m.quaternion })
          if (enableHaptics) pulse('right', 0.4, 45)
          if (enableAudio) playTone(520, 60)
        }}
      >
        <sphereGeometry args={[objectSize * 0.55, 16, 16]} />
        <meshStandardMaterial color={color} transparent opacity={opacity} />
      </mesh>

      {activeSpace && (
        <XRHitTest
          space={activeSpace}
          onResults={(results, getWorldMatrix) => {
            const m = previewRef.current
            if (!m) return
            if (results.length === 0) {
              m.visible = false
              return
            }
            m.visible = true
            getWorldMatrix(matrixHelper, results[0])
            pos.setFromMatrixPosition(matrixHelper)
            quat.setFromRotationMatrix(matrixHelper)
            m.position.copy(pos)
            m.quaternion.copy(quat)
          }}
        />
      )}
    </group>
  )
}
