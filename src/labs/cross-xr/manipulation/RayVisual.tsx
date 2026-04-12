import { useFrame } from '@react-three/fiber'
import { useRef, useMemo } from 'react'
import {
  BoxGeometry,
  Group,
  Mesh,
  ShaderMaterial,
  Vector3,
} from 'three'
import type { HandJointData } from './useHandJoints'
import type { ManipulationTechnique } from '../ObjectManipulationLab'
import { estimateShoulderPosition } from './techniques'

type RayVisualProps = {
  joints: HandJointData
  technique: ManipulationTechnique
  shoulderOffset: [number, number, number]
  headPosition: Vector3
  visible: boolean
}

const RAY_LENGTH = 2.5
const RAY_WIDTH = 0.003
const CURSOR_SIZE = 0.008

const rayVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const rayFragmentShader = `
  varying vec2 vUv;
  uniform vec3 uColor;
  void main() {
    float fade = 1.0 - smoothstep(0.0, 1.0, vUv.y);
    float edgeFade = 1.0 - smoothstep(0.3, 0.5, abs(vUv.x - 0.5));
    float alpha = fade * edgeFade * 0.7;
    gl_FragColor = vec4(uColor, alpha);
  }
`

const _tmpOrigin = new Vector3()
const _tmpEnd = new Vector3()
const _tmpDir = new Vector3()
const _tmpMid = new Vector3()

/**
 * Renders a ray styled to match the default @react-three/xr pointer ray.
 * Thin mesh with gradient fade, technique-specific origin.
 */
export function RayVisual({ joints, technique, shoulderOffset, headPosition, visible }: RayVisualProps) {
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const cursorRef = useRef<Mesh>(null)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: rayVertexShader,
        fragmentShader: rayFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: [1, 1, 1] },
        },
      }),
    [],
  )

  const geometry = useMemo(() => new BoxGeometry(RAY_WIDTH, 1, RAY_WIDTH), [])

  useFrame(() => {
    const group = groupRef.current
    const mesh = meshRef.current
    const cursor = cursorRef.current
    if (!group || !mesh || !cursor || !joints.isTracking || !visible) {
      if (group) group.visible = false
      return
    }

    let origin: Vector3
    let dir: Vector3

    if (technique === 'HRI') {
      origin = _tmpOrigin.copy(joints.wristPosition)
      dir = _tmpDir.set(0, 0, -1).applyQuaternion(joints.wristQuaternion)
    } else if (technique === 'HRS') {
      const shoulder = estimateShoulderPosition(headPosition, joints.wristPosition, shoulderOffset)
      origin = _tmpOrigin.copy(shoulder)
      dir = _tmpDir.subVectors(joints.wristPosition, shoulder).normalize()
    } else {
      group.visible = false
      return
    }

    _tmpEnd.copy(origin).addScaledVector(dir, RAY_LENGTH)
    _tmpMid.lerpVectors(origin, _tmpEnd, 0.5)

    mesh.position.copy(_tmpMid)
    mesh.lookAt(_tmpEnd)
    mesh.rotateX(Math.PI / 2)
    mesh.scale.set(1, RAY_LENGTH, 1)

    cursor.position.copy(_tmpEnd)

    group.visible = true
  })

  if (technique !== 'HRI' && technique !== 'HRS') return null

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} material={material} geometry={geometry} renderOrder={2} />
      <mesh ref={cursorRef} renderOrder={2}>
        <sphereGeometry args={[CURSOR_SIZE, 8, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  )
}
