import { useEffect, useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import { Group, Quaternion, Vector3 } from 'three'
import type { ManipulableEntry } from './useManipulation'
import type { ReactNode } from 'react'

type ManipulableObjectProps = {
  id: string
  initialPosition: Vector3 | [number, number, number]
  initialQuaternion?: Quaternion
  /** Half-extents along local X/Y/Z (same convention as boxGeometry width/height/depth / 2). */
  hitHalfExtents: [number, number, number]
  register: (entry: ManipulableEntry) => () => void
  isActive?: boolean
  onPointerDown?: (event: ThreeEvent<PointerEvent>) => void
  onPointerUp?: (event: ThreeEvent<PointerEvent>) => void
  children: ReactNode
}

export function ManipulableObject({
  id,
  initialPosition,
  initialQuaternion,
  hitHalfExtents,
  register,
  isActive = false,
  onPointerDown,
  onPointerUp,
  children,
}: ManipulableObjectProps) {
  const groupRef = useRef<Group>(null)
  const positionRef = useRef(
    initialPosition instanceof Vector3
      ? initialPosition.clone()
      : new Vector3(...initialPosition),
  )
  const quaternionRef = useRef(initialQuaternion?.clone() ?? new Quaternion())
  const halfExtentsRef = useRef(new Vector3(...hitHalfExtents))

  useEffect(() => {
    halfExtentsRef.current.set(hitHalfExtents[0], hitHalfExtents[1], hitHalfExtents[2])
  }, [hitHalfExtents[0], hitHalfExtents[1], hitHalfExtents[2]])

  useEffect(() => {
    const unregister = register({
      id,
      objectRef: groupRef,
      position: positionRef.current,
      quaternion: quaternionRef.current,
      hitHalfExtents: halfExtentsRef.current,
    })
    return unregister
  }, [id, register])

  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(positionRef.current)
      groupRef.current.quaternion.copy(quaternionRef.current)
    }
  }, [])

  useEffect(() => {
    if (initialPosition instanceof Vector3) {
      positionRef.current.copy(initialPosition)
    } else {
      positionRef.current.set(...initialPosition)
    }
    if (groupRef.current) {
      groupRef.current.position.copy(positionRef.current)
    }
  }, [initialPosition])

  useEffect(() => {
    quaternionRef.current.copy(initialQuaternion ?? new Quaternion())
    if (groupRef.current) {
      groupRef.current.quaternion.copy(quaternionRef.current)
    }
  }, [initialQuaternion])

  return (
    <group
      ref={groupRef}
      pointerEventsType={onPointerDown || onPointerUp ? { allow: 'ray' } : undefined}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {children}
    </group>
  )
}
