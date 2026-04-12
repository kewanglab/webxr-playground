import { useEffect, useRef } from 'react'
import { Group, Quaternion, Vector3 } from 'three'
import type { ManipulableEntry } from './useManipulation'
import type { ReactNode } from 'react'

type ManipulableObjectProps = {
  id: string
  initialPosition: Vector3 | [number, number, number]
  initialQuaternion?: Quaternion
  hitRadius?: number
  register: (entry: ManipulableEntry) => () => void
  isActive?: boolean
  children: ReactNode
}

export function ManipulableObject({
  id,
  initialPosition,
  initialQuaternion,
  hitRadius = 0.1,
  register,
  isActive = false,
  children,
}: ManipulableObjectProps) {
  const groupRef = useRef<Group>(null)
  const positionRef = useRef(
    initialPosition instanceof Vector3
      ? initialPosition.clone()
      : new Vector3(...initialPosition),
  )
  const quaternionRef = useRef(initialQuaternion?.clone() ?? new Quaternion())

  useEffect(() => {
    const unregister = register({
      id,
      objectRef: groupRef,
      position: positionRef.current,
      quaternion: quaternionRef.current,
      hitRadius,
    })
    return unregister
  }, [id, register, hitRadius])

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(positionRef.current)
      groupRef.current.quaternion.copy(quaternionRef.current)
    }
  }, [])

  return (
    <group ref={groupRef}>
      {children}
    </group>
  )
}
