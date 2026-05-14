import { Line, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useGetXRSpaceMatrix, useXRInputSourceState } from '@react-three/xr'
import { useControls } from 'leva'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Group, Matrix4, Quaternion, Vector3 } from 'three'

import { useHudReport } from '../../app/useHudReport'
import { usePlaygroundStore } from '../../app/store'
import { getLabTitle } from '../../config/labs'
import { useConfirmTone } from '../../xr/feedback/audio/useConfirmTone'
import { useHapticPulse } from '../../xr/feedback/haptics/useHapticPulse'
import { LabHeading } from '../LabHeading'
import {
  useMicrogesture,
  type MicrogestureDirection,
  type MicrogestureState,
} from './microgesture/useMicrogesture'

const FORWARD = new Vector3(0, 0, -1)
const UP = new Vector3(0, 1, 0)

type ArcState =
  | { kind: 'idle' }
  | { kind: 'aiming'; armedAtMs: number }

/**
 * Sample a quadratic Bézier from `from` to `to` with the control point raised
 * `peakY` above the higher endpoint. Mirrors LocomotionLab's `quadArcPoints`,
 * inlined here so the microgesture lab stays self-contained.
 */
function arcPoints(
  from: Vector3,
  to: Vector3,
  peakY: number,
  samples = 24,
): [number, number, number][] {
  const pts: [number, number, number][] = []
  const mx = (from.x + to.x) * 0.5
  const my = Math.max(from.y, to.y) + peakY
  const mz = (from.z + to.z) * 0.5
  for (let i = 0; i <= samples; i++) {
    const t = i / samples
    const u = 1 - t
    const x = u * u * from.x + 2 * u * t * mx + t * t * to.x
    const y = u * u * from.y + 2 * u * t * my + t * t * to.y
    const z = u * u * from.z + 2 * u * t * mz + t * t * to.z
    pts.push([x, y, z])
  }
  return pts
}

/**
 * Project a ray (origin + forward direction) onto the floor plane y = 0 and
 * return the landing point, clamped to `maxRangeM` from the origin. Returns
 * null if the ray points away from the floor (dy >= 0).
 */
function projectToFloor(origin: Vector3, forward: Vector3, maxRangeM: number): Vector3 | null {
  if (forward.y >= -0.05) return null
  const t = -origin.y / forward.y
  if (t <= 0) return null
  const landing = origin.clone().addScaledVector(forward, t)
  const dx = landing.x - origin.x
  const dz = landing.z - origin.z
  const horizontal = Math.hypot(dx, dz)
  if (horizontal > maxRangeM) {
    const scale = maxRangeM / horizontal
    landing.x = origin.x + dx * scale
    landing.z = origin.z + dz * scale
  }
  return landing
}

/**
 * Reads the hand's forward direction either from the wrist quaternion
 * (`hand-forward` axis = wrist · (0,0,-1)) or from the index finger's axial
 * vector (proximal → tip), depending on the leva toggle. Returns null when
 * tracking is lost.
 */
function useHandAim(
  handedness: XRHandedness,
  axis: 'hand-forward' | 'index-axial',
): { origin: Vector3; forward: Vector3; ok: boolean } {
  const hand = useXRInputSourceState('hand', handedness)?.inputSource.hand
  const wristSpace = useMemo(() => hand?.get('wrist'), [hand])
  const indexProxSpace = useMemo(() => hand?.get('index-finger-phalanx-proximal'), [hand])
  const indexTipSpace = useMemo(() => hand?.get('index-finger-tip'), [hand])
  const getWrist = useGetXRSpaceMatrix(wristSpace)
  const getProx = useGetXRSpaceMatrix(indexProxSpace)
  const getTip = useGetXRSpaceMatrix(indexTipSpace)

  const tmp = useMemo(
    () => ({
      wrist: new Matrix4(),
      prox: new Matrix4(),
      tip: new Matrix4(),
      wristQ: new Quaternion(),
      scratchQ: new Quaternion(),
      scratchScale: new Vector3(),
      proxPos: new Vector3(),
      tipPos: new Vector3(),
    }),
    [],
  )

  const result = useRef({ origin: new Vector3(), forward: new Vector3(0, 0, -1), ok: false })

  useFrame((_, __, frame) => {
    const ok =
      (getWrist?.(tmp.wrist, frame) ?? false) &&
      (getProx?.(tmp.prox, frame) ?? false) &&
      (getTip?.(tmp.tip, frame) ?? false)
    result.current.ok = ok
    if (!ok) return
    tmp.wrist.decompose(result.current.origin, tmp.wristQ, tmp.scratchScale)
    if (axis === 'hand-forward') {
      result.current.forward.copy(FORWARD).applyQuaternion(tmp.wristQ).normalize()
    } else {
      tmp.prox.decompose(tmp.proxPos, tmp.scratchQ, tmp.scratchScale)
      tmp.tip.decompose(tmp.tipPos, tmp.scratchQ, tmp.scratchScale)
      result.current.forward.copy(tmp.tipPos).sub(tmp.proxPos)
      if (result.current.forward.lengthSq() < 1e-8) {
        result.current.forward.copy(FORWARD).applyQuaternion(tmp.wristQ)
      }
      result.current.forward.normalize()
    }
  })

  return result.current
}

function TeleportArc({
  from,
  to,
  peakY,
  color,
}: {
  from: Vector3
  to: Vector3
  peakY: number
  color: string
}) {
  const points = useMemo(() => arcPoints(from, to, peakY, 28), [from, to, peakY])
  return (
    <>
      <Line points={points} color={color} lineWidth={3.2} transparent opacity={0.95} />
      <group position={[to.x, 0.02, to.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.22, 40]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <circleGeometry args={[0.18, 40]} />
          <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}

function DebugLabel({ state }: { state: MicrogestureState }) {
  const ref = useRef<Group>(null!)
  const distRef = useRef<{ text?: string } | null>(null)
  const eventRef = useRef<{ text?: string } | null>(null)
  useFrame(() => {
    if (!state.isTracking) {
      ref.current.visible = false
      return
    }
    ref.current.visible = true
    ref.current.position.set(
      state.handOrigin.x,
      state.handOrigin.y + 0.18,
      state.handOrigin.z,
    )
    if (distRef.current) {
      distRef.current.text = `${(state.contactDistanceM * 1000).toFixed(0)} mm  ${
        state.inContact ? '●' : '○'
      }`
    }
    if (eventRef.current) {
      const ageMs = state.lastEventAt ? performance.now() - state.lastEventAt : Infinity
      eventRef.current.text =
        state.lastEvent && ageMs < 1500 ? state.lastEvent.toUpperCase() : ''
    }
  })
  return (
    <group ref={ref}>
      <Text
        ref={distRef as never}
        fontSize={0.028}
        color="#ffffff"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.002}
        outlineColor="#000000"
      >
        {'… mm  ○'}
      </Text>
      <Text
        ref={eventRef as never}
        position={[0, 0.05, 0]}
        fontSize={0.04}
        color="#ffd166"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.003}
        outlineColor="#000000"
      >
        {''}
      </Text>
    </group>
  )
}

export function MicrogestureLab() {
  const controls = useControls('Microgesture', {
    handedness: { options: { Right: 'right', Left: 'left' }, value: 'right' },
    aimAxis: {
      options: { 'Hand forward': 'hand-forward', 'Index axial': 'index-axial' },
      value: 'hand-forward',
      label: 'Aim axis',
    },
    contactThresholdM: { value: 0.022, min: 0.005, max: 0.08, step: 0.001 },
    releaseHysteresisM: { value: 0.008, min: 0, max: 0.05, step: 0.001 },
    tapMaxDurationMs: { value: 350, min: 80, max: 1000, step: 10 },
    swipeMinDistanceM: { value: 0.025, min: 0.005, max: 0.1, step: 0.001 },
    swipeMaxDurationMs: { value: 500, min: 100, max: 1500, step: 10 },
    lateralInvert: { value: false, label: 'Invert L/R' },
    snapTurnDeg: { value: 30, min: 5, max: 90, step: 1 },
    stepDistanceM: { value: 0.3, min: 0.05, max: 1.5, step: 0.05 },
    armTimeoutMs: {
      value: 4000,
      min: 500,
      max: 10000,
      step: 100,
      label: 'Arc arm timeout',
    },
    arcMaxRangeM: { value: 8, min: 1, max: 20, step: 0.5, label: 'Arc max range' },
    arcPeakHeightM: { value: 0.9, min: 0.2, max: 2.5, step: 0.1, label: 'Arc peak height' },
    enableHaptics: true,
    enableTone: true,
    showDebugOverlay: { value: true, label: 'Debug overlay' },
  })

  const triggerHaptic = useHapticPulse()
  const playTone = useConfirmTone()
  const setOriginPosition = usePlaygroundStore((s) => s.setOriginPosition)
  const setOriginRotationY = usePlaygroundStore((s) => s.setOriginRotationY)

  const aim = useHandAim(
    controls.handedness as XRHandedness,
    controls.aimAxis as 'hand-forward' | 'index-axial',
  )

  const [arcState, setArcState] = useState<ArcState>({ kind: 'idle' })
  const arcStateRef = useRef<ArcState>(arcState)
  arcStateRef.current = arcState

  const [landing, setLanding] = useState<Vector3 | null>(null)
  const landingRef = useRef<Vector3 | null>(null)
  landingRef.current = landing

  // Auto-cancel the arc if the user doesn't commit within armTimeoutMs.
  useEffect(() => {
    if (arcState.kind !== 'aiming') return
    const timer = window.setTimeout(() => {
      setArcState({ kind: 'idle' })
      setLanding(null)
    }, controls.armTimeoutMs)
    return () => clearTimeout(timer)
  }, [arcState, controls.armTimeoutMs])

  // Update the landing point every frame while aiming so the arc follows the hand.
  useFrame(() => {
    if (arcStateRef.current.kind !== 'aiming') return
    if (!aim.ok) return
    const next = projectToFloor(aim.origin, aim.forward, controls.arcMaxRangeM)
    if (!next) return
    const prev = landingRef.current
    if (
      !prev ||
      Math.abs(prev.x - next.x) > 0.01 ||
      Math.abs(prev.z - next.z) > 0.01
    ) {
      setLanding(next)
    }
  })

  const handleTap = useCallback(() => {
    if (controls.enableTone) playTone(660, 90)
    if (controls.enableHaptics) {
      triggerHaptic(controls.handedness as 'left' | 'right', 0.6, 80)
    }
    const cur = arcStateRef.current
    if (cur.kind === 'idle') {
      const next = aim.ok
        ? projectToFloor(aim.origin, aim.forward, controls.arcMaxRangeM)
        : null
      setLanding(next)
      setArcState({ kind: 'aiming', armedAtMs: performance.now() })
    } else {
      const target = landingRef.current
      if (target) {
        const store = usePlaygroundStore.getState()
        const next = store.originPosition.clone()
        next.x += target.x - store.originPosition.x
        next.z += target.z - store.originPosition.z
        setOriginPosition(next)
        if (controls.enableTone) playTone(880, 110)
      }
      setArcState({ kind: 'idle' })
      setLanding(null)
    }
  }, [
    aim,
    controls.arcMaxRangeM,
    controls.enableHaptics,
    controls.enableTone,
    controls.handedness,
    playTone,
    triggerHaptic,
    setOriginPosition,
  ])

  const handleSwipe = useCallback(
    (dir: MicrogestureDirection) => {
      if (controls.enableTone) playTone(dir === 'forward' || dir === 'back' ? 520 : 440, 70)
      if (controls.enableHaptics) {
        triggerHaptic(controls.handedness as 'left' | 'right', 0.4, 60)
      }
      const store = usePlaygroundStore.getState()
      if (dir === 'left' || dir === 'right') {
        const deltaRad = ((dir === 'right' ? -1 : 1) * controls.snapTurnDeg * Math.PI) / 180
        setOriginRotationY(store.originRotationY + deltaRad)
      } else {
        const forward = FORWARD.clone().applyAxisAngle(UP, store.originRotationY)
        const sign = dir === 'forward' ? 1 : -1
        const next = store.originPosition
          .clone()
          .addScaledVector(forward, sign * controls.stepDistanceM)
        setOriginPosition(next)
      }
      // Any swipe also cancels an armed arc — matches Meta's "swipe wins" precedence.
      if (arcStateRef.current.kind !== 'idle') {
        setArcState({ kind: 'idle' })
        setLanding(null)
      }
    },
    [
      controls.enableHaptics,
      controls.enableTone,
      controls.handedness,
      controls.snapTurnDeg,
      controls.stepDistanceM,
      playTone,
      triggerHaptic,
      setOriginPosition,
      setOriginRotationY,
    ],
  )

  const state = useMicrogesture(
    controls.handedness as XRHandedness,
    {
      contactThresholdM: controls.contactThresholdM,
      releaseHysteresisM: controls.releaseHysteresisM,
      tapMaxDurationMs: controls.tapMaxDurationMs,
      swipeMinDistanceM: controls.swipeMinDistanceM,
      swipeMaxDurationMs: controls.swipeMaxDurationMs,
      lateralInvert: controls.lateralInvert,
    },
    { onTap: handleTap, onSwipe: handleSwipe },
  )

  // 10 Hz tick so the HUD report reflects live distance / contact state.
  const lastTickRef = useRef(0)
  const [, force] = useState(0)
  useFrame(() => {
    const now = performance.now()
    if (now - lastTickRef.current > 100) {
      lastTickRef.current = now
      force((c) => (c + 1) & 0xfff)
    }
  })

  const ageMs = state.lastEventAt ? performance.now() - state.lastEventAt : Infinity
  const lastLabel = state.lastEvent && ageMs < 1500 ? state.lastEvent : '—'
  const armedLabel = arcState.kind === 'aiming' ? 'ARMED' : '—'

  useHudReport(
    {
      methodLabel: `Microgesture · ${controls.handedness}`,
      trial: null,
      metrics: [
        { label: 'DIST', value: `${(state.contactDistanceM * 1000).toFixed(0)} mm` },
        { label: 'CONTACT', value: state.inContact ? 'ON' : '—' },
        { label: 'LAST', value: lastLabel.toUpperCase() },
        { label: 'ARC', value: armedLabel },
      ],
    },
    [
      state.contactDistanceM,
      state.inContact,
      lastLabel,
      armedLabel,
      controls.handedness,
    ],
  )

  const arcColor = arcState.kind === 'aiming' ? '#ffd166' : '#06d6a0'

  return (
    <group>
      <LabHeading
        title={getLabTitle('microgesture')}
        subtitle={`${controls.handedness} hand · tap→arm→tap=teleport · L/R swipe=turn · F/B swipe=step`}
        archPosition={[0, 0, -4.0]}
      />

      {arcState.kind === 'aiming' && landing && (
        <TeleportArc
          from={aim.origin}
          to={landing}
          peakY={controls.arcPeakHeightM}
          color={arcColor}
        />
      )}

      {controls.showDebugOverlay && <DebugLabel state={state} />}
    </group>
  )
}
