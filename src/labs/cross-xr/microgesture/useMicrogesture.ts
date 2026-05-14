import { useFrame } from '@react-three/fiber'
import { useGetXRSpaceMatrix, useXRInputSourceState } from '@react-three/xr'
import { useMemo, useRef } from 'react'
import { Matrix4, Quaternion, Vector3 } from 'three'

export type MicrogestureDirection = 'left' | 'right' | 'forward' | 'back'
export type MicrogestureEvent = 'tap' | MicrogestureDirection

export type MicrogestureCallbacks = {
  onTap?: () => void
  onSwipe?: (direction: MicrogestureDirection) => void
}

export type MicrogestureThresholds = {
  contactThresholdM: number
  releaseHysteresisM: number
  tapMaxDurationMs: number
  swipeMinDistanceM: number
  swipeMaxDurationMs: number
  lateralInvert: boolean
}

export type MicrogestureState = {
  isTracking: boolean
  contactDistanceM: number
  inContact: boolean
  lastEvent: MicrogestureEvent | null
  lastEventAt: number
  handOrigin: Vector3
}

/**
 * Detects Meta-style microgestures on a tracked WebXR hand: a thumb tap on the
 * intermediate phalanx of the index finger, plus 4-direction swipes along the
 * side of the index. Classification happens on contact release so the start
 * and end positions are both known.
 *
 * Coordinate frame derived from joint chain (not the wrist quaternion) so the
 * "lateral" axis follows the index finger's actual pose, not the wrist's:
 *   axial   = (indexTip − indexProximal).normalized()
 *   palmUp  = wristQuat · (0,1,0)
 *   lateral = palmUp × axial  (flipped by `lateralInvert` to match user mapping)
 */
export function useMicrogesture(
  handedness: XRHandedness,
  thresholds: MicrogestureThresholds,
  callbacks: MicrogestureCallbacks,
): MicrogestureState {
  const handState = useXRInputSourceState('hand', handedness)
  const hand = handState?.inputSource.hand

  const wristSpace = useMemo(() => hand?.get('wrist'), [hand])
  const thumbTipSpace = useMemo(() => hand?.get('thumb-tip'), [hand])
  const indexProxSpace = useMemo(() => hand?.get('index-finger-phalanx-proximal'), [hand])
  const indexMidSpace = useMemo(() => hand?.get('index-finger-phalanx-intermediate'), [hand])
  const indexTipSpace = useMemo(() => hand?.get('index-finger-tip'), [hand])

  const getWrist = useGetXRSpaceMatrix(wristSpace)
  const getThumbTip = useGetXRSpaceMatrix(thumbTipSpace)
  const getIndexProx = useGetXRSpaceMatrix(indexProxSpace)
  const getIndexMid = useGetXRSpaceMatrix(indexMidSpace)
  const getIndexTip = useGetXRSpaceMatrix(indexTipSpace)

  const tmp = useMemo(
    () => ({
      wrist: new Matrix4(),
      thumb: new Matrix4(),
      iProx: new Matrix4(),
      iMid: new Matrix4(),
      iTip: new Matrix4(),
      wristPos: new Vector3(),
      wristQ: new Quaternion(),
      thumbPos: new Vector3(),
      iProxPos: new Vector3(),
      iMidPos: new Vector3(),
      iTipPos: new Vector3(),
      scratchQ: new Quaternion(),
      scratchScale: new Vector3(),
      axial: new Vector3(),
      palmUp: new Vector3(),
      lateral: new Vector3(),
      delta: new Vector3(),
    }),
    [],
  )

  const stateRef = useRef<MicrogestureState>({
    isTracking: false,
    contactDistanceM: 0,
    inContact: false,
    lastEvent: null,
    lastEventAt: 0,
    handOrigin: new Vector3(),
  })

  const contactStartMs = useRef<number | null>(null)
  const contactStartThumb = useMemo(() => new Vector3(), [])
  const contactStartAxial = useMemo(() => new Vector3(), [])
  const contactStartLateral = useMemo(() => new Vector3(), [])

  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks
  const thresholdsRef = useRef(thresholds)
  thresholdsRef.current = thresholds

  useFrame((_, __, frame) => {
    const s = stateRef.current
    const t = thresholdsRef.current
    const ok =
      (getWrist?.(tmp.wrist, frame) ?? false) &&
      (getThumbTip?.(tmp.thumb, frame) ?? false) &&
      (getIndexProx?.(tmp.iProx, frame) ?? false) &&
      (getIndexMid?.(tmp.iMid, frame) ?? false) &&
      (getIndexTip?.(tmp.iTip, frame) ?? false)

    s.isTracking = ok
    if (!ok) {
      if (s.inContact) {
        s.inContact = false
        contactStartMs.current = null
      }
      return
    }

    tmp.wrist.decompose(tmp.wristPos, tmp.wristQ, tmp.scratchScale)
    tmp.thumb.decompose(tmp.thumbPos, tmp.scratchQ, tmp.scratchScale)
    tmp.iProx.decompose(tmp.iProxPos, tmp.scratchQ, tmp.scratchScale)
    tmp.iMid.decompose(tmp.iMidPos, tmp.scratchQ, tmp.scratchScale)
    tmp.iTip.decompose(tmp.iTipPos, tmp.scratchQ, tmp.scratchScale)

    s.handOrigin.copy(tmp.wristPos)
    s.contactDistanceM = tmp.thumbPos.distanceTo(tmp.iMidPos)

    tmp.axial.copy(tmp.iTipPos).sub(tmp.iProxPos)
    if (tmp.axial.lengthSq() < 1e-8) return
    tmp.axial.normalize()
    tmp.palmUp.set(0, 1, 0).applyQuaternion(tmp.wristQ).normalize()
    tmp.lateral.copy(tmp.palmUp).cross(tmp.axial)
    if (tmp.lateral.lengthSq() < 1e-8) return
    tmp.lateral.normalize()
    if (t.lateralInvert) tmp.lateral.multiplyScalar(-1)

    const now = performance.now()
    const enter = s.contactDistanceM < t.contactThresholdM
    const release = s.contactDistanceM > t.contactThresholdM + t.releaseHysteresisM

    if (!s.inContact && enter) {
      s.inContact = true
      contactStartMs.current = now
      contactStartThumb.copy(tmp.thumbPos)
      contactStartAxial.copy(tmp.axial)
      contactStartLateral.copy(tmp.lateral)
    } else if (s.inContact && release) {
      s.inContact = false
      const start = contactStartMs.current ?? now
      const durMs = now - start
      tmp.delta.copy(tmp.thumbPos).sub(contactStartThumb)
      const dAxial = tmp.delta.dot(contactStartAxial)
      const dLateral = tmp.delta.dot(contactStartLateral)
      const planar = Math.hypot(dAxial, dLateral)

      if (planar >= t.swipeMinDistanceM && durMs <= t.swipeMaxDurationMs) {
        const dir: MicrogestureDirection =
          Math.abs(dAxial) >= Math.abs(dLateral)
            ? dAxial >= 0
              ? 'forward'
              : 'back'
            : dLateral >= 0
              ? 'right'
              : 'left'
        s.lastEvent = dir
        s.lastEventAt = now
        callbacksRef.current.onSwipe?.(dir)
      } else if (durMs <= t.tapMaxDurationMs) {
        s.lastEvent = 'tap'
        s.lastEventAt = now
        callbacksRef.current.onTap?.()
      }

      contactStartMs.current = null
    }
  })

  return stateRef.current
}
