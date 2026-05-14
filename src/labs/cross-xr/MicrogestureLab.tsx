import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { useCallback, useRef, useState } from 'react'
import { Group, Vector3 } from 'three'

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

const ORB_POSITIONS: Array<[number, number, number]> = [
  [-0.7, 1.45, -2.2],
  [0, 1.6, -2.6],
  [0.7, 1.45, -2.2],
]

const FORWARD = new Vector3(0, 0, -1)
const UP = new Vector3(0, 1, 0)
const ORB_FORWARD_SCRATCH = new Vector3()

function Orb({
  position,
  hovered,
  confirmed,
  onPointerEnter,
  onPointerLeave,
}: {
  position: [number, number, number]
  hovered: boolean
  confirmed: boolean
  onPointerEnter: () => void
  onPointerLeave: () => void
}) {
  const ref = useRef<Group>(null!)
  useFrame((_, dt) => {
    const target = confirmed ? 1.4 : hovered ? 1.15 : 1
    const cur = ref.current.scale.x
    const k = Math.min(1, dt * 8)
    ref.current.scale.setScalar(cur + (target - cur) * k)
  })
  const color = confirmed ? '#ffd166' : hovered ? '#06d6a0' : '#118ab2'
  const emissive = confirmed ? 0.8 : hovered ? 0.45 : 0.15
  return (
    <group ref={ref} position={position}>
      <mesh
        pointerEventsType={{ allow: 'ray' }}
        onPointerEnter={(e) => {
          e.stopPropagation()
          onPointerEnter()
        }}
        onPointerLeave={(e) => {
          e.stopPropagation()
          onPointerLeave()
        }}
      >
        <sphereGeometry args={[0.12, 28, 28]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissive}
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>
    </group>
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
      const ageMs = state.lastEventAt
        ? performance.now() - state.lastEventAt
        : Infinity
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
    contactThresholdM: { value: 0.022, min: 0.005, max: 0.08, step: 0.001 },
    releaseHysteresisM: { value: 0.008, min: 0, max: 0.05, step: 0.001 },
    tapMaxDurationMs: { value: 350, min: 80, max: 1000, step: 10 },
    swipeMinDistanceM: { value: 0.025, min: 0.005, max: 0.1, step: 0.001 },
    swipeMaxDurationMs: { value: 500, min: 100, max: 1500, step: 10 },
    lateralInvert: { value: false, label: 'Invert L/R' },
    snapTurnDeg: { value: 30, min: 5, max: 90, step: 1 },
    stepDistanceM: { value: 0.5, min: 0.1, max: 2, step: 0.05 },
    enableHaptics: true,
    enableTone: true,
    showDebugOverlay: { value: true, label: 'Debug overlay' },
  })

  const triggerHaptic = useHapticPulse()
  const playTone = useConfirmTone()
  const setOriginPosition = usePlaygroundStore((s) => s.setOriginPosition)
  const setOriginRotationY = usePlaygroundStore((s) => s.setOriginRotationY)

  const [hoveredOrb, setHoveredOrb] = useState<number | null>(null)
  const hoveredOrbRef = useRef<number | null>(null)
  hoveredOrbRef.current = hoveredOrb

  const [confirmedOrb, setConfirmedOrb] = useState<number | null>(null)
  const confirmTimerRef = useRef<number | null>(null)

  const handleTap = useCallback(() => {
    if (controls.enableTone) playTone(660, 90)
    if (controls.enableHaptics) {
      triggerHaptic(controls.handedness as 'left' | 'right', 0.6, 80)
    }
    const idx = hoveredOrbRef.current
    if (idx != null) {
      setConfirmedOrb(idx)
      if (confirmTimerRef.current != null) clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = window.setTimeout(() => setConfirmedOrb(null), 600)
    }
  }, [
    controls.enableHaptics,
    controls.enableTone,
    controls.handedness,
    playTone,
    triggerHaptic,
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
        const forward = ORB_FORWARD_SCRATCH.copy(FORWARD).applyAxisAngle(UP, store.originRotationY)
        const sign = dir === 'forward' ? 1 : -1
        const next = store.originPosition
          .clone()
          .addScaledVector(forward, sign * controls.stepDistanceM)
        setOriginPosition(next)
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

  useHudReport(
    {
      methodLabel: `Microgesture · ${controls.handedness}`,
      trial: null,
      metrics: [
        { label: 'DIST', value: `${(state.contactDistanceM * 1000).toFixed(0)} mm` },
        { label: 'CONTACT', value: state.inContact ? 'ON' : '—' },
        { label: 'LAST', value: lastLabel.toUpperCase() },
        { label: 'TRACK', value: state.isTracking ? 'OK' : '—' },
      ],
    },
    [
      state.contactDistanceM,
      state.inContact,
      state.isTracking,
      lastLabel,
      controls.handedness,
    ],
  )

  return (
    <group>
      <LabHeading
        title={getLabTitle('microgesture')}
        subtitle={`${controls.handedness} hand · tap = select · swipe L/R = turn · swipe F/B = step`}
        archPosition={[0, 0, -3.2]}
      />

      {ORB_POSITIONS.map((p, i) => (
        <Orb
          key={i}
          position={p}
          hovered={hoveredOrb === i}
          confirmed={confirmedOrb === i}
          onPointerEnter={() => setHoveredOrb(i)}
          onPointerLeave={() =>
            setHoveredOrb((curr) => (curr === i ? null : curr))
          }
        />
      ))}

      {controls.showDebugOverlay && <DebugLabel state={state} />}
    </group>
  )
}
