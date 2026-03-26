import { Text } from '@react-three/drei'
import {
  IfInSessionMode,
  XRHitTest,
  useXRInputSourceState,
} from '@react-three/xr'
import { useControls } from 'leva'
import { useMemo, useRef, useState } from 'react'
import { Matrix4, Quaternion, Vector3, type Mesh } from 'three'

export function PlacementLab() {
  const { objectSize, previewOpacity } = useControls('Placement', {
    objectSize: { value: 0.12, min: 0.05, max: 0.3, step: 0.01 },
    previewOpacity: { value: 0.4, min: 0, max: 1, step: 0.05 },
  })

  type Placed = {
    id: string
    position: Vector3
    quaternion: Quaternion
    source: 'ray' | 'pinch'
  }

  const [placed, setPlaced] = useState<Placed[]>([])

  return (
    <group>
      <Text
        position={[0, 1.5, -2]}
        fontSize={0.15}
        color="#888"
        anchorX="center"
        anchorY="middle"
      >
        Placement Lab — Phase 2 (Hit-test placement)
      </Text>

      <IfInSessionMode allow="immersive-ar">
        <group>
          <PlacementPreview
            color="#60a5fa"
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
            objectSize={objectSize}
            mode="controller"
          />

          <PlacementPreview
            color="#fbbf24"
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
            objectSize={objectSize}
            mode="hand"
          />

          {placed.map((p) => (
            <mesh key={p.id} position={p.position} quaternion={p.quaternion}>
              <boxGeometry args={[objectSize, objectSize, objectSize]} />
              <meshStandardMaterial
                color={p.source === 'ray' ? '#3b82f6' : '#f59e0b'}
              />
            </mesh>
          ))}
        </group>
      </IfInSessionMode>

      {!placed.length && (
        <Text
          position={[0, 1.15, -2]}
          fontSize={0.12}
          color="#999"
          anchorX="center"
          anchorY="middle"
        >
          Enter AR to preview placement (controllers = blue, pinch = orange)
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
}: {
  color: string
  opacity: number
  objectSize: number
  mode: 'controller' | 'hand'
  onPlace: (transform: { position: Vector3; quaternion: Quaternion }) => void
}) {
  const previewRef = useRef<Mesh>(null)
  const matrixHelper = useMemo(() => new Matrix4(), [])
  const pos = useMemo(() => new Vector3(), [])
  const quat = useMemo(() => new Quaternion(), [])

  const controllerState = useXRInputSourceState('controller', 'right')
  const handState = useXRInputSourceState('hand', 'right')

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
