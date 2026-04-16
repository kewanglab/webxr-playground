import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type ReactNode } from 'react'
import { Group, Quaternion, Vector3 } from 'three'
import { useIsInXR } from '../core/hooks'

type TagAlongHUDProps = {
  children: ReactNode
}

const tmpForward = new Vector3()
const tmpRight = new Vector3()
const tmpUp = new Vector3()
const tmpTargetPos = new Vector3()
const tmpCameraPos = new Vector3()
const tmpCameraQuat = new Quaternion()
const worldUp = new Vector3(0, 1, 0)

/**
 * Smoothly follows the headset so HUD content stays in the lower-left field of view
 * without rigid head-lock.
 */
export function TagAlongHUD({ children }: TagAlongHUDProps) {
  const groupRef = useRef<Group>(null)
  const { camera } = useThree()
  const inXR = useIsInXR()

  const smoothPos = useRef(new Vector3())
  const smoothQuat = useRef(new Quaternion())
  const initialized = useRef(false)

  useEffect(() => {
    if (!inXR) initialized.current = false
  }, [inXR])

  useFrame((_, delta) => {
    const g = groupRef.current
    if (!g || !inXR) return

    camera.getWorldPosition(tmpCameraPos)
    camera.getWorldQuaternion(tmpCameraQuat)
    camera.getWorldDirection(tmpForward)
    tmpRight.crossVectors(tmpForward, worldUp)
    if (tmpRight.lengthSq() < 1e-8) {
      tmpRight.set(1, 0, 0)
    } else {
      tmpRight.normalize()
    }
    tmpUp.crossVectors(tmpRight, tmpForward).normalize()

    // Offset in view space: negative right = left, negative up = down (bottom-left corner).
    tmpTargetPos
      .copy(tmpCameraPos)
      .addScaledVector(tmpForward, 0.9)
      .addScaledVector(tmpRight, -0.4)
      .addScaledVector(tmpUp, -0.4)

    if (!initialized.current) {
      smoothPos.current.copy(tmpTargetPos)
      smoothQuat.current.copy(tmpCameraQuat)
      initialized.current = true
    }

    const k = 1 - Math.pow(0.88, delta * 60)
    smoothPos.current.lerp(tmpTargetPos, k)
    smoothQuat.current.slerp(tmpCameraQuat, k)

    g.position.copy(smoothPos.current)
    g.quaternion.copy(smoothQuat.current)
  })

  if (!inXR) return null

  return (
    <group ref={groupRef} scale={0.62}>
      {children}
    </group>
  )
}
