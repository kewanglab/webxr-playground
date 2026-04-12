import { useFrame } from '@react-three/fiber'
import { useXRInputSourceState, useXR } from '@react-three/xr'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'
import { useGetXRSpaceMatrix } from '@react-three/xr'

export type HandJointData = {
  wristPosition: Vector3
  wristQuaternion: Quaternion
  thumbTipPosition: Vector3
  thumbTipQuaternion: Quaternion
  indexTipPosition: Vector3
  isPinching: boolean
  /** True when hand tracking is active and joint data is valid */
  isTracking: boolean
}

/**
 * Reads wrist, thumb-tip, and index-finger-tip world-space transforms each frame.
 * Pinch state is driven by WebXR selectstart/selectend events (Quest firmware detection).
 */
export function useHandJoints(handedness: XRHandedness = 'right'): HandJointData {
  const handState = useXRInputSourceState('hand', handedness)
  const session = useXR((xr) => xr.session)

  const hand = handState?.inputSource.hand

  const wristSpace = useMemo(() => hand?.get('wrist'), [hand])
  const thumbTipSpace = useMemo(() => hand?.get('thumb-tip'), [hand])
  const indexTipSpace = useMemo(() => hand?.get('index-finger-tip'), [hand])

  const getWristMatrix = useGetXRSpaceMatrix(wristSpace)
  const getThumbTipMatrix = useGetXRSpaceMatrix(thumbTipSpace)
  const getIndexTipMatrix = useGetXRSpaceMatrix(indexTipSpace)

  const wristMat = useMemo(() => new Matrix4(), [])
  const thumbTipMat = useMemo(() => new Matrix4(), [])
  const indexTipMat = useMemo(() => new Matrix4(), [])

  const dataRef = useRef<HandJointData>({
    wristPosition: new Vector3(),
    wristQuaternion: new Quaternion(),
    thumbTipPosition: new Vector3(),
    thumbTipQuaternion: new Quaternion(),
    indexTipPosition: new Vector3(),
    isPinching: false,
    isTracking: false,
  })

  const pinchRef = useRef(false)
  const inputSourceRef = useRef(handState?.inputSource)
  inputSourceRef.current = handState?.inputSource

  useEffect(() => {
    if (!session) return

    const onSelectStart = (e: XRInputSourceEvent) => {
      if (e.inputSource === inputSourceRef.current) {
        pinchRef.current = true
      }
    }
    const onSelectEnd = (e: XRInputSourceEvent) => {
      if (e.inputSource === inputSourceRef.current) {
        pinchRef.current = false
      }
    }

    session.addEventListener('selectstart', onSelectStart)
    session.addEventListener('selectend', onSelectEnd)
    return () => {
      session.removeEventListener('selectstart', onSelectStart)
      session.removeEventListener('selectend', onSelectEnd)
    }
  }, [session])

  const tmpScale = useMemo(() => new Vector3(), [])

  useFrame((_, __, frame) => {
    const data = dataRef.current
    const wristOk = getWristMatrix?.(wristMat, frame) ?? false
    const thumbOk = getThumbTipMatrix?.(thumbTipMat, frame) ?? false
    const indexOk = getIndexTipMatrix?.(indexTipMat, frame) ?? false

    data.isTracking = wristOk && thumbOk && indexOk

    if (wristOk) {
      wristMat.decompose(data.wristPosition, data.wristQuaternion, tmpScale)
    }
    if (thumbOk) {
      thumbTipMat.decompose(data.thumbTipPosition, data.thumbTipQuaternion, tmpScale)
    }
    if (indexOk) {
      indexTipMat.decompose(data.indexTipPosition, new Quaternion(), tmpScale)
    }

    data.isPinching = pinchRef.current
  })

  return dataRef.current
}
