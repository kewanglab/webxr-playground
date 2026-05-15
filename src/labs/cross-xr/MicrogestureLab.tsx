import { Billboard, Line, Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
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
  type MicrogestureUserFrame,
} from './microgesture/useMicrogesture'

const WORLD_FORWARD = new Vector3(0, 0, -1)
const WORLD_RIGHT = new Vector3(1, 0, 0)
const WORLD_UP = new Vector3(0, 1, 0)

type ArcState =
  | { kind: 'idle' }
  | { kind: 'aiming'; armedAtMs: number }

function arcPoints(
  from: Vector3,
  to: Vector3,
  peakY: number,
  samples = 28,
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
 * Reads the hand's forward direction either from the wrist quaternion or the
 * index proximal→tip vector. Returns null when tracking is lost.
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
      result.current.forward.copy(WORLD_FORWARD).applyQuaternion(tmp.wristQ).normalize()
    } else {
      tmp.prox.decompose(tmp.proxPos, tmp.scratchQ, tmp.scratchScale)
      tmp.tip.decompose(tmp.tipPos, tmp.scratchQ, tmp.scratchScale)
      result.current.forward.copy(tmp.tipPos).sub(tmp.proxPos)
      if (result.current.forward.lengthSq() < 1e-8) {
        result.current.forward.copy(WORLD_FORWARD).applyQuaternion(tmp.wristQ)
      }
      result.current.forward.normalize()
    }
  })

  return result.current
}

/**
 * Thin white Meta-style teleport arc + small ring reticle on the floor.
 * No filled landing disc; matches the screenshot reference.
 */
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
  const points = useMemo(() => arcPoints(from, to, peakY), [from, to, peakY])
  return (
    <>
      <Line
        points={points}
        color={color}
        lineWidth={2.2}
        transparent
        opacity={0.95}
        depthWrite={false}
      />
      <group position={[to.x, 0.01, to.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.09, 0.105, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.95} depthWrite={false} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <ringGeometry args={[0.012, 0.022, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      </group>
    </>
  )
}

/**
 * Meta-style affordance pad anchored to the intermediate phalanx of the index
 * finger. Four direction arrows + a center contact ring. Position follows the
 * joint each frame; orientation is rebuilt every frame to match the user's
 * head pose so left/right always points to the user's actual left/right.
 *
 * The matching arrow flashes (scale + color) when the corresponding gesture
 * fires, fading over `EVENT_FLASH_MS`.
 */
const EVENT_FLASH_MS = 600

type ArrowRef = {
  group: Group | null
  text: { color?: string; fillOpacity?: number; outlineOpacity?: number } | null
}

function GestureAffordance({
  handedness,
  state,
  userFrame,
}: {
  handedness: XRHandedness
  state: MicrogestureState
  userFrame: MicrogestureUserFrame
}) {
  const hand = useXRInputSourceState('hand', handedness)?.inputSource.hand
  const jointSpace = useMemo(
    () => hand?.get('index-finger-phalanx-intermediate'),
    [hand],
  )
  const getMatrix = useGetXRSpaceMatrix(jointSpace)

  const rootRef = useRef<Group>(null!)
  const contactRef = useRef<Group>(null)
  const leftArrow = useRef<ArrowRef>({ group: null, text: null })
  const rightArrow = useRef<ArrowRef>({ group: null, text: null })
  const fwdArrow = useRef<ArrowRef>({ group: null, text: null })
  const backArrow = useRef<ArrowRef>({ group: null, text: null })

  const tmp = useMemo(
    () => ({
      mat: new Matrix4(),
      pos: new Vector3(),
      quat: new Quaternion(),
      scale: new Vector3(),
      lookTarget: new Vector3(),
    }),
    [],
  )

  useFrame((_, dt, xrFrame) => {
    if (!rootRef.current) return
    if (!state.isTracking) {
      rootRef.current.visible = false
      return
    }
    const ok = getMatrix?.(tmp.mat, xrFrame) ?? false
    if (!ok) {
      rootRef.current.visible = false
      return
    }
    rootRef.current.visible = true
    tmp.mat.decompose(tmp.pos, tmp.quat, tmp.scale)
    // Hover ~2.5 cm above the joint origin in world-up direction. Looks "on
    // top of" the finger from most natural poses without intersecting the
    // mesh, and reads the same regardless of how the user rotates the hand.
    rootRef.current.position.set(tmp.pos.x, tmp.pos.y + 0.025, tmp.pos.z)
    // Orient so local -Z points along the user's world forward (projected to
    // ground) and +X along the user's world right. Then placing the four
    // arrows in local axes maps cleanly to user-frame swipe directions.
    rootRef.current.up.copy(WORLD_UP)
    tmp.lookTarget
      .copy(rootRef.current.position)
      .addScaledVector(userFrame.forward, -1) // lookAt target = pos - forward,
    // so the object's -Z ends up aligned to +forward.
    rootRef.current.lookAt(tmp.lookTarget)

    // Animate per-arrow flash on the most recent gesture event.
    const ageMs = state.lastEventAt ? performance.now() - state.lastEventAt : Infinity
    const fade = Math.max(0, 1 - ageMs / EVENT_FLASH_MS)
    const apply = (ref: React.MutableRefObject<ArrowRef>, active: boolean) => {
      const r = ref.current
      const targetScale = active ? 1 + 0.5 * fade : 1
      if (r.group) {
        const k = Math.min(1, dt * 18)
        const cur = r.group.scale.x
        r.group.scale.setScalar(cur + (targetScale - cur) * k)
      }
      if (r.text) {
        r.text.color = active && fade > 0 ? '#ffd166' : '#ffffff'
      }
    }
    apply(leftArrow, state.lastEvent === 'left')
    apply(rightArrow, state.lastEvent === 'right')
    apply(fwdArrow, state.lastEvent === 'forward')
    apply(backArrow, state.lastEvent === 'back')

    if (contactRef.current) {
      const k = Math.min(1, dt * 14)
      const target = state.inContact ? 1.55 : 1
      const cur = contactRef.current.scale.x
      contactRef.current.scale.setScalar(cur + (target - cur) * k)
    }
  })

  // After the lookAt above, local axes are:
  //   -Z = user forward, +Z = user back, +X = user right, -X = user left,
  //   +Y = world up. So we lay arrows out in the XZ plane (level with the
  //   finger top) and let drei <Billboard> orient each glyph toward the
  //   user's head so they always read clearly.
  return (
    <group ref={rootRef}>
      <group ref={contactRef} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh>
          <ringGeometry args={[0.008, 0.012, 28]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.95} depthWrite={false} />
        </mesh>
      </group>

      <group
        position={[-0.032, 0, 0]}
        ref={(g) => {
          leftArrow.current.group = g
        }}
      >
        <Billboard>
          <Text
            ref={(t) => {
              leftArrow.current.text = t as unknown as ArrowRef['text']
            }}
            fontSize={0.026}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.0022}
            outlineColor="#000000"
          >
            ←
          </Text>
        </Billboard>
      </group>

      <group
        position={[0.032, 0, 0]}
        ref={(g) => {
          rightArrow.current.group = g
        }}
      >
        <Billboard>
          <Text
            ref={(t) => {
              rightArrow.current.text = t as unknown as ArrowRef['text']
            }}
            fontSize={0.026}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.0022}
            outlineColor="#000000"
          >
            →
          </Text>
        </Billboard>
      </group>

      <group
        position={[0, 0, -0.032]}
        ref={(g) => {
          fwdArrow.current.group = g
        }}
      >
        <Billboard>
          <Text
            ref={(t) => {
              fwdArrow.current.text = t as unknown as ArrowRef['text']
            }}
            fontSize={0.024}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.002}
            outlineColor="#000000"
          >
            ↑
          </Text>
        </Billboard>
      </group>

      <group
        position={[0, 0, 0.032]}
        ref={(g) => {
          backArrow.current.group = g
        }}
      >
        <Billboard>
          <Text
            ref={(t) => {
              backArrow.current.text = t as unknown as ArrowRef['text']
            }}
            fontSize={0.024}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.002}
            outlineColor="#000000"
          >
            ↓
          </Text>
        </Billboard>
      </group>
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
    showAffordance: { value: true, label: 'Affordance arrows' },
  })

  const triggerHaptic = useHapticPulse()
  const playTone = useConfirmTone()
  const setOriginPosition = usePlaygroundStore((s) => s.setOriginPosition)
  const setOriginRotationY = usePlaygroundStore((s) => s.setOriginRotationY)

  const { camera } = useThree()

  // Live user-frame axes (world coords, projected to ground plane). Mutated
  // each frame from the camera; passed by reference into useMicrogesture so
  // gesture classification reads the latest values.
  const userFrame = useMemo<MicrogestureUserFrame>(
    () => ({ forward: new Vector3(0, 0, -1), right: new Vector3(1, 0, 0) }),
    [],
  )
  const userFrameRef = useRef<MicrogestureUserFrame>(userFrame)
  userFrameRef.current = userFrame

  const tmpForward = useMemo(() => new Vector3(), [])
  const tmpRight = useMemo(() => new Vector3(), [])

  useFrame(() => {
    tmpForward.copy(WORLD_FORWARD).applyQuaternion(camera.quaternion)
    tmpForward.y = 0
    if (tmpForward.lengthSq() > 1e-6) {
      tmpForward.normalize()
      userFrame.forward.copy(tmpForward)
    }
    tmpRight.copy(WORLD_RIGHT).applyQuaternion(camera.quaternion)
    tmpRight.y = 0
    if (tmpRight.lengthSq() > 1e-6) {
      tmpRight.normalize()
      userFrame.right.copy(tmpRight)
    }
  })

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

  useEffect(() => {
    if (arcState.kind !== 'aiming') return
    const timer = window.setTimeout(() => {
      setArcState({ kind: 'idle' })
      setLanding(null)
    }, controls.armTimeoutMs)
    return () => clearTimeout(timer)
  }, [arcState, controls.armTimeoutMs])

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
        // Step along the *user's* forward (projected to ground), not the hand's.
        const sign = dir === 'forward' ? 1 : -1
        const next = store.originPosition
          .clone()
          .addScaledVector(userFrameRef.current.forward, sign * controls.stepDistanceM)
        setOriginPosition(next)
      }
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
    },
    userFrame,
    { onTap: handleTap, onSwipe: handleSwipe },
  )

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
          color="#ffffff"
        />
      )}

      {controls.showAffordance && (
        <GestureAffordance
          handedness={controls.handedness as XRHandedness}
          state={state}
          userFrame={userFrame}
        />
      )}
    </group>
  )
}

