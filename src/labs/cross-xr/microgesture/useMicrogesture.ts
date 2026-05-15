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
}

/**
 * World-space axes the lab considers "forward" and "right" from the user's
 * point of view. The caller mutates these each frame from the camera/head
 * pose; the hook reads them at gesture-classification time.
 */
export type MicrogestureUserFrame = {
  forward: Vector3
  right: Vector3
}

export type MicrogestureState = {
  isTracking: boolean
  contactDistanceM: number
  inContact: boolean
  lastEvent: MicrogestureEvent | null
  lastEventAt: number
  /** World position of the wrist — useful for camera-facing overlays. */
  handOrigin: Vector3
}

/**
 * Detects Meta-style microgestures on a tracked WebXR hand: a thumb tap on
 * the intermediate phalanx of the index finger, plus four-direction swipes.
 *
 * Classification happens on contact release. The thumb's displacement from
 * the moment of contact to the moment of release is projected onto the
 * **user's** forward / right axes (supplied by the caller via `userFrame`)
 * — NOT the index finger's local axes. This matches Meta's product semantics:
 * "swipe left" means the thumb moved to the user's left in the world, not
 * along an axis derived from finger curl. The dominant component picks the
 * direction; magnitude must exceed `swipeMinDistanceM` and duration must be
 * under `swipeMaxDurationMs`; otherwise the release counts as a tap (if it
 * was short enough).
 */
export function useMicrogesture(
  handedness: XRHandedness,
  thresholds: MicrogestureThresholds,
  userFrame: MicrogestureUserFrame,
  callbacks: MicrogestureCallbacks,
): MicrogestureState {
  const handState = useXRInputSourceState('hand', handedness)
  const hand = handState?.inputSource.hand

  const wristSpace = useMemo(() => hand?.get('wrist'), [hand])
  const thumbTipSpace = useMemo(() => hand?.get('thumb-tip'), [hand])
  const indexMidSpace = useMemo(() => hand?.get('index-finger-phalanx-intermediate'), [hand])

  const getWrist = useGetXRSpaceMatrix(wristSpace)
  const getThumbTip = useGetXRSpaceMatrix(thumbTipSpace)
  const getIndexMid = useGetXRSpaceMatrix(indexMidSpace)

  const tmp = useMemo(
    () => ({
      wrist: new Matrix4(),
      thumb: new Matrix4(),
      iMid: new Matrix4(),
      wristPos: new Vector3(),
      wristQ: new Quaternion(),
      thumbPos: new Vector3(),
      iMidPos: new Vector3(),
      scratchQ: new Quaternion(),
      scratchScale: new Vector3(),
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
      (getIndexMid?.(tmp.iMid, frame) ?? false)

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
    tmp.iMid.decompose(tmp.iMidPos, tmp.scratchQ, tmp.scratchScale)

    s.handOrigin.copy(tmp.wristPos)
    s.contactDistanceM = tmp.thumbPos.distanceTo(tmp.iMidPos)

    const now = performance.now()
    const enter = s.contactDistanceM < t.contactThresholdM
    const release = s.contactDistanceM > t.contactThresholdM + t.releaseHysteresisM

    if (!s.inContact && enter) {
      s.inContact = true
      contactStartMs.current = now
      contactStartThumb.copy(tmp.thumbPos)
    } else if (s.inContact && release) {
      s.inContact = false
      const start = contactStartMs.current ?? now
      const durMs = now - start
      tmp.delta.copy(tmp.thumbPos).sub(contactStartThumb)
      const dForward = tmp.delta.dot(userFrame.forward)
      const dRight = tmp.delta.dot(userFrame.right)
      const planar = Math.hypot(dForward, dRight)

      if (planar >= t.swipeMinDistanceM && durMs <= t.swipeMaxDurationMs) {
        const dir: MicrogestureDirection =
          Math.abs(dForward) >= Math.abs(dRight)
            ? dForward >= 0
              ? 'forward'
              : 'back'
            : dRight >= 0
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

