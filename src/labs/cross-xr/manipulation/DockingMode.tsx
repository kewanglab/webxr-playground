import { Text } from '../../../xr/visual/XRText'
import { useFrame } from '@react-three/fiber'
import { button, useControls } from 'leva'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Color, Euler, Quaternion, Shape, Vector3 } from 'three'
import type { ManipulationAcquisition, ManipulationTechnique } from '../ObjectManipulationLab'
import type { ManipulationResult } from './techniques'
import { useHudReport } from '../../../app/useHudReport'
import { tuningPresets } from '../../../config/labs'
import { logTrialResult, useTrialRunner } from '../../../xr/interactions/evaluation'
import type { Tinted } from '../../../config/playgroundTheme'
import { usePlaygroundTheme } from '../../../xr/theme/PlaygroundThemeContext'
import {
  CloudParkShadowBlob,
  CloudParkWorkbenchHandle,
  FloatingCloudMat,
} from '../../../xr/visual/CloudParkScenery'
import { useHandJoints } from './useHandJoints'
import { useManipulation } from './useManipulation'
import { ManipulableObject } from './ManipulableObject'
import { useHapticPulse } from '../../../xr/feedback/haptics/useHapticPulse'
import { useInitialEyeLevelOffset } from '../../../xr/core/useInitialEyeLevelOffset'

type DockingModeProps = {
  acquisition: ManipulationAcquisition
  technique: ManipulationTechnique
  hand: 'left' | 'right'
  objectSize: number
  grabDistance: number
  cdGain: number
}

type TrialType = 'translation' | 'rotation' | 'combined'

type Trial = {
  type: TrialType
  targetPosition: Vector3
  targetQuaternion: Quaternion
  /** Rotation magnitude for this trial (0 for pure translation) — the paper's difficulty ladder. */
  rotationMagnitudeDeg: number
  /** Axis combination the rotation is applied about, e.g. 'X', 'XY'; '—' when none. */
  axes: string
}

/** Measured at the moment of release — kept honest even when the object auto-snaps. */
type DockingTrialResult = {
  technique: ManipulationTechnique
  positionalOffset: number
  rotationalOffsetDeg: number
  /** Paper measure: object appears → pinch release. */
  completionTimeS: number
  /** Paper measure: object appears → pinch down. `null` when acquisition wasn't observed. */
  acquisitionTimeS: number | null
  snapped: boolean
}

const OBJECT_ORIGIN = new Vector3(0, 1.2, -0.7)
const DEFAULTS = tuningPresets.manipulation
const MIN_TARGET_Y = OBJECT_ORIGIN.y - DEFAULTS.docking.translationOffsetM
const DESK_SURFACE_Y = MIN_TARGET_Y - 0.2 + 0.04
const TABLE_SURFACE_BELOW_EYE_M = 0.54
const DEFAULT_STANDING_EYE_HEIGHT_M = 1.66
const DESK_PLATFORM_WIDTH = 1.45
const DESK_PLATFORM_DEPTH = 0.78
const DESK_PLATFORM_THICKNESS = 0.06
const DEFAULT_TABLE_OFFSET_Y =
  DEFAULT_STANDING_EYE_HEIGHT_M - TABLE_SURFACE_BELOW_EYE_M - DESK_SURFACE_Y
const SIDE_CONSOLE_HEIGHT_M = 1.2
const SIDE_CONSOLE_GROUND_Y = 0.001

function addYOffset(position: [number, number, number], offsetY: number): [number, number, number] {
  return [position[0], position[1] + offsetY, position[2]]
}

/**
 * Key-crystal silhouette per design-handoff v0.2 Section 02 / 04 (manipulation · docking).
 * Shaft (rectangular prism) + notched pentagonal head + UP-indicator (dot for solid, arrow for ghost).
 * Characteristic height = `objectSize` (matches code's `tuningPresets.manipulation.objectSize` default).
 * Orientation convention: +Y is the key's "up" axis; head sits above the shaft along +Y.
 */
function KeyCrystal({
  objectSize,
  variant,
  solidColor,
  accentColor,
  ghostTint,
  active = false,
}: {
  objectSize: number
  variant: 'solid' | 'ghost'
  solidColor: string
  accentColor: string
  ghostTint?: Tinted
  active?: boolean
}) {
  const shaftW = objectSize * 0.24
  const shaftD = objectSize * 0.12
  const shaftH = objectSize * 0.62
  const headH = objectSize * 0.38
  const headW = objectSize * 0.46
  const shaftCenterY = shaftH * 0.5 - objectSize * 0.5 // center the whole key on its local origin
  const headBaseY = shaftCenterY + shaftH * 0.5

  // Notched-pentagon head profile (half-width 0.5, height 1.0 — scaled via Shape extrusion).
  const headShape = useMemo(() => {
    const s = new Shape()
    s.moveTo(-0.5, 0)
    s.lineTo(-0.5, 0.55)
    s.lineTo(0, 1)
    s.lineTo(0.5, 0.55)
    s.lineTo(0.5, 0)
    s.closePath()
    return s
  }, [])
  const headDepth = shaftD * 1.05

  if (variant === 'ghost') {
    // Ghost wireframe is hand-tuned bright (0.95) — that reads as a clear "preview shell"
    // even when the underlying token alpha (~0.7–0.75) would be too soft. Keep the
    // hardcoded 0.95 here; only the color comes from the token.
    const tint = ghostTint?.color ?? '#A8D4E0'
    return (
      <group>
        {/* Shaft wireframe. */}
        <mesh position={[0, shaftCenterY, 0]}>
          <boxGeometry args={[shaftW, shaftH, shaftD]} />
          <meshBasicMaterial
            color={tint}
            wireframe
            transparent
            opacity={0.95}
            depthWrite={false}
          />
        </mesh>
        {/* Head wireframe (pentagonal extrude). */}
        <mesh
          position={[0, headBaseY, 0]}
          scale={[headW, headH, headDepth]}
        >
          <extrudeGeometry args={[headShape, { depth: 1, bevelEnabled: false }]} />
          <meshBasicMaterial
            color={tint}
            wireframe
            transparent
            opacity={0.95}
            depthWrite={false}
          />
        </mesh>
        {/* Centered UP arrow inside head — shows required orientation. */}
        <group position={[0, headBaseY + headH * 0.5, headDepth * 0.55]}>
          {/* Arrow stem. */}
          <mesh position={[0, -headH * 0.12, 0]}>
            <boxGeometry args={[headH * 0.08, headH * 0.48, 0.002]} />
            <meshBasicMaterial color={tint} transparent opacity={0.95} depthWrite={false} />
          </mesh>
          {/* Arrow tip (triangle via cone, 3 radial segments). */}
          <mesh position={[0, headH * 0.18, 0]}>
            <coneGeometry args={[headH * 0.18, headH * 0.22, 3]} />
            <meshBasicMaterial color={tint} transparent opacity={0.95} depthWrite={false} />
          </mesh>
        </group>
      </group>
    )
  }

  const emissiveI = active ? 0.4 : 0.18
  return (
    <group>
      {/* Shaft. */}
      <mesh position={[0, shaftCenterY, 0]}>
        <boxGeometry args={[shaftW, shaftH, shaftD]} />
        <meshStandardMaterial
          color={solidColor}
          emissive={solidColor}
          emissiveIntensity={emissiveI}
          roughness={0.32}
          metalness={0.12}
        />
      </mesh>
      {/* Pentagonal notched head. */}
      <mesh
        position={[0, headBaseY, 0]}
        scale={[headW, headH, headDepth]}
      >
        <extrudeGeometry args={[headShape, { depth: 1, bevelEnabled: false }]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColor}
          emissiveIntensity={emissiveI + 0.08}
          roughness={0.24}
          metalness={0.18}
        />
      </mesh>
      {/* UP indicator dot — bright cream sphere embedded in head. */}
      <mesh position={[0, headBaseY + headH * 0.55, headDepth * 0.55]}>
        <sphereGeometry args={[objectSize * 0.04, 14, 10]} />
        <meshBasicMaterial color="#FFFAEE" />
      </mesh>
    </group>
  )
}

/**
 * Proximity hint ring — flat on the XZ plane, Phase 2 selection-ring style.
 * Radius = `objectSize * 0.75` so the ring sits tight against the key with a slim margin.
 * Opacity pulses at 1.2 Hz (matches Phase 2 targeted-ring cadence) to invite, not decorate.
 */
function ProximityRing({
  visible,
  objectSize,
  tint,
}: {
  visible: boolean
  objectSize: number
  tint: Tinted
}) {
  const matRef = useRef<import('three').MeshBasicMaterial | null>(null)

  useFrame(() => {
    if (!visible) return
    const now = performance.now() / 1000
    const phase = Math.sin(now * 1.2 * Math.PI * 2)
    if (matRef.current) matRef.current.opacity = 0.55 + 0.2 * phase // 0.35 → 0.75
  })

  if (!visible) return null

  const ringR = objectSize * 0.75
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[ringR - 0.004, ringR + 0.004, 48]} />
      <meshBasicMaterial
        ref={matRef}
        color={tint.color}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  )
}

const DECK_PLATE_THICKNESS = 0.014
/** Inset from the desk edge, per side, so the desk's own rim stays visible. */
const DECK_PLATE_MARGIN = 0.045
/** Inset of the inlaid inner panel from the plate edge, per side. */
const DECK_PLATE_INSET = 0.055
/** Height of the inlay, and how far it stands proud of the plate's top face. */
const DECK_PLATE_INLAY_HEIGHT = 0.002

/**
 * Working surface laid over the desk in the Warm Night theme — the plate the
 * docking target sits on, and the visual floor for the depth cue.
 *
 * Built from primitives rather than loaded from the xr-kit: it replaced a
 * `platform_simple.glb` whose source pack's redistribution terms were never
 * resolved, which was the last thing blocking a public deploy.
 *
 * Two things the GLB did for free have to be done explicitly here. Its baked
 * trim-sheet darkened the surface well below `stone`, which is what let the
 * stone-coloured cradles and supports read against it — hence the plate base
 * being pulled halfway to `seal`, or the whole desk flattens into one tone from
 * overhead. And its mesh sat inside its own footprint, leaving a lip of desk
 * visible around it; `DECK_PLATE_MARGIN` reproduces that rim.
 */
function DeckPlate({
  offsetY,
  stone,
  seal,
  mustard,
}: {
  offsetY: number
  stone: string
  seal: string
  mustard: string
}) {
  // Half-way between the desk's `stone` and the plinth's `seal` — the taupe the
  // GLB's baked albedo landed on. `mustard` alone reads too warm here, and
  // `stone` alone loses the furniture against the surface.
  const plateColor = useMemo(
    () => new Color(stone).lerp(new Color(seal), 0.5),
    [stone, seal],
  )
  // Inlay lifts back toward `stone` so it reads as a change of finish rather
  // than a second slab.
  const innerColor = useMemo(
    () => new Color(stone).lerp(new Color(seal), 0.38),
    [stone, seal],
  )
  const plateWidth = DESK_PLATFORM_WIDTH - DECK_PLATE_MARGIN * 2
  const plateDepth = DESK_PLATFORM_DEPTH - DECK_PLATE_MARGIN * 2

  return (
    <group>
      <mesh
        position={addYOffset(
          [
            OBJECT_ORIGIN.x,
            DESK_SURFACE_Y + DECK_PLATE_THICKNESS / 2,
            OBJECT_ORIGIN.z + 0.04,
          ],
          offsetY,
        )}
      >
        <boxGeometry args={[plateWidth, DECK_PLATE_THICKNESS, plateDepth]} />
        <meshStandardMaterial
          color={plateColor}
          emissive={mustard}
          emissiveIntensity={0.03}
          roughness={0.88}
          metalness={0.04}
        />
      </mesh>
      {/* Stacked on the plate's top face, not sunk into it: an earlier version
          centred this 2 mm box 1 mm *below* the top, which put it entirely
          inside the opaque plate and drew nothing. Sitting proud gives the
          surface-finish break the GLB's trim-sheet used to provide. */}
      <mesh
        position={addYOffset(
          [
            OBJECT_ORIGIN.x,
            DESK_SURFACE_Y + DECK_PLATE_THICKNESS + DECK_PLATE_INLAY_HEIGHT / 2,
            OBJECT_ORIGIN.z + 0.04,
          ],
          offsetY,
        )}
      >
        <boxGeometry
          args={[
            plateWidth - DECK_PLATE_INSET * 2,
            DECK_PLATE_INLAY_HEIGHT,
            plateDepth - DECK_PLATE_INSET * 2,
          ]}
        />
        <meshStandardMaterial
          color={innerColor}
          emissive={mustard}
          emissiveIntensity={0.05}
          roughness={0.74}
          metalness={0.1}
        />
      </mesh>
    </group>
  )
}

function DockingStation({
  objectSize,
  stone,
  seal,
  primary,
  secondary,
  offsetY,
  isCloudPark,
}: {
  objectSize: number
  stone: string
  seal: string
  primary: string
  secondary: string
  offsetY: number
  isCloudPark: boolean
}) {
  if (isCloudPark) {
    return (
      <group>
        <FloatingCloudMat
          position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.36, OBJECT_ORIGIN.z - 0.02], offsetY)}
          scale={0.98}
          cloudColor={stone}
          shadeColor="#DFF4E6"
          rimColor={secondary}
        />
        <CloudParkShadowBlob
          position={addYOffset([OBJECT_ORIGIN.x, DESK_SURFACE_Y - 0.01, OBJECT_ORIGIN.z + 0.04], offsetY)}
          scale={[1.82, 1, 1.02]}
          color={primary}
          opacity={0.11}
        />
        <mesh
          position={addYOffset(
            [OBJECT_ORIGIN.x, DESK_SURFACE_Y - DESK_PLATFORM_THICKNESS / 2, OBJECT_ORIGIN.z + 0.04],
            offsetY,
          )}
          scale={[1.28, 1, 0.68]}
        >
          <cylinderGeometry args={[0.58, 0.68, DESK_PLATFORM_THICKNESS, 32]} />
          <meshStandardMaterial color={stone} roughness={0.86} metalness={0.02} />
        </mesh>
        {[-0.46, 0.46].map((x) => (
          <mesh
            key={`cloud-table-support-${x}`}
            position={addYOffset([OBJECT_ORIGIN.x + x, MIN_TARGET_Y - 0.165, OBJECT_ORIGIN.z - 0.02], offsetY)}
          >
            <capsuleGeometry args={[0.045, 0.18, 7, 12]} />
            <meshStandardMaterial color={stone} roughness={0.9} emissive={secondary} emissiveIntensity={0.025} />
          </mesh>
        ))}
      </group>
    )
  }

  return (
    <group>
      <mesh position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.34, OBJECT_ORIGIN.z - 0.06], offsetY)}>
        <boxGeometry args={[1.7, 0.12, 0.86]} />
        <meshStandardMaterial color={seal} roughness={0.96} emissive={seal} emissiveIntensity={0.05} />
      </mesh>
      <mesh position={addYOffset([OBJECT_ORIGIN.x, MIN_TARGET_Y - 0.23, OBJECT_ORIGIN.z - 0.1], offsetY)}>
        <boxGeometry args={[1.18, 0.1, 0.4]} />
        <meshStandardMaterial color={stone} roughness={0.88} />
      </mesh>
      <mesh
        position={addYOffset(
          [OBJECT_ORIGIN.x, DESK_SURFACE_Y - DESK_PLATFORM_THICKNESS / 2, OBJECT_ORIGIN.z + 0.04],
          offsetY,
        )}
      >
        <boxGeometry args={[DESK_PLATFORM_WIDTH, DESK_PLATFORM_THICKNESS, DESK_PLATFORM_DEPTH]} />
        <meshStandardMaterial color={stone} roughness={0.82} metalness={0.08} />
      </mesh>
      {[-0.42, 0, 0.42].map((x) => (
        <mesh
          key={`table-support-${x}`}
          position={addYOffset([OBJECT_ORIGIN.x + x, MIN_TARGET_Y - 0.175, OBJECT_ORIGIN.z - 0.02], offsetY)}
        >
          <boxGeometry args={[0.08, 0.18, 0.12]} />
          <meshStandardMaterial color={stone} roughness={0.86} />
        </mesh>
      ))}
      {[-0.52, 0.52].map((x) => (
        <mesh
          key={`cradle-${x}`}
          position={addYOffset([OBJECT_ORIGIN.x + x, MIN_TARGET_Y - 0.08, OBJECT_ORIGIN.z - 0.04], offsetY)}
        >
          <boxGeometry args={[0.1, 0.22, 0.32]} />
          <meshStandardMaterial color={stone} roughness={0.84} />
        </mesh>
      ))}
      {/* Single holo rail spanning the inner top-far corners of the two
          cradle blocks. Material mirrors the removed back half-dome torus:
          basic, primary tint, transparent 0.42, no depth write — reads as a
          continuation of that original holo "energy line".
          The rail's top-back edge sits exactly at the corner: the
          (0.028 / 2 = 0.014) y- and z-offsets push the rail's body down and
          forward so it sits inside the cradle's top-far volume rather than
          floating above and behind it. */}
      <mesh
        position={addYOffset(
          [
            OBJECT_ORIGIN.x,
            MIN_TARGET_Y + 0.03 - 0.014,
            OBJECT_ORIGIN.z - 0.2 + 0.014,
          ],
          offsetY,
        )}
      >
        <boxGeometry args={[0.94, 0.028, 0.028]} />
        <meshBasicMaterial
          color={primary}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

/**
 * Combined-task difficulty ladder — Mikkelsen et al. §3.3: "±30 cm offset along
 * the X axis with ±45, 90, 135° angular offsets along one or two axes. Each of
 * the 18 combinations of angular offset and axes (X, Y, Z, XY, XZ, YZ) is
 * tested, while the direction of both translation and rotation is chosen
 * uniformly random."
 *
 * The paper's headline finding — separated beats integrated for Virtual Hand —
 * appears only in these harder combined trials, so the full ladder is what makes
 * the result reproducible here.
 */
const COMBINED_ANGLES_DEG = [45, 90, 135] as const
const COMBINED_AXES: { key: string; mask: [number, number, number] }[] = [
  { key: 'X', mask: [1, 0, 0] },
  { key: 'Y', mask: [0, 1, 0] },
  { key: 'Z', mask: [0, 0, 1] },
  // Two-axis conditions apply the same angular offset about both axes.
  { key: 'XY', mask: [1, 1, 0] },
  { key: 'XZ', mask: [1, 0, 1] },
  { key: 'YZ', mask: [0, 1, 1] },
]

export type TrialSet = 'paper' | 'quick'

/** Uniformly random ±1, per the paper's randomized trial directions. */
function randomSign(): number {
  return Math.random() < 0.5 ? -1 : 1
}

/**
 * `paper` reproduces the paper's per-technique block: 6 translation + 6 rotation
 * + 18 combined = 30 trials (the paper runs 2 repetitions; one repetition here
 * keeps a session to a sensible length). `quick` is a 6-trial demo subset.
 */
export function generateTrials(trialSet: TrialSet): Trial[] {
  const { translationOffsetM, rotationOffsetDeg } = DEFAULTS.docking
  const trials: Trial[] = []
  const axes: { key: string; mask: [number, number, number] }[] = [
    { key: 'X', mask: [1, 0, 0] },
    { key: 'Y', mask: [0, 1, 0] },
    { key: 'Z', mask: [0, 0, 1] },
  ]
  const signs = [1, -1]
  const eulerFor = (mask: [number, number, number], deg: number, sign: number) =>
    new Euler(
      ((mask[0] * deg * sign * Math.PI) / 180),
      ((mask[1] * deg * sign * Math.PI) / 180),
      ((mask[2] * deg * sign * Math.PI) / 180),
    )

  // Translation: ±offset along each of X, Y, Z (6 trials).
  for (const axis of axes) {
    for (const sign of signs) {
      trials.push({
        type: 'translation',
        targetPosition: new Vector3(
          OBJECT_ORIGIN.x + axis.mask[0] * translationOffsetM * sign,
          OBJECT_ORIGIN.y + axis.mask[1] * translationOffsetM * sign,
          OBJECT_ORIGIN.z + axis.mask[2] * translationOffsetM * sign,
        ),
        targetQuaternion: new Quaternion(),
        rotationMagnitudeDeg: 0,
        axes: '—',
      })
    }
  }

  // Rotation: ±rotationOffset about each of X, Y, Z, position unchanged (6 trials).
  for (const axis of axes) {
    for (const sign of signs) {
      trials.push({
        type: 'rotation',
        targetPosition: OBJECT_ORIGIN.clone(),
        targetQuaternion: new Quaternion().setFromEuler(
          eulerFor(axis.mask, rotationOffsetDeg, sign),
        ),
        rotationMagnitudeDeg: rotationOffsetDeg,
        axes: axis.key,
      })
    }
  }

  // Combined: 3 angles × 6 axis combinations, directions uniformly random (18 trials).
  for (const angle of COMBINED_ANGLES_DEG) {
    for (const axis of COMBINED_AXES) {
      trials.push({
        type: 'combined',
        targetPosition: new Vector3(
          OBJECT_ORIGIN.x + translationOffsetM * randomSign(),
          OBJECT_ORIGIN.y,
          OBJECT_ORIGIN.z,
        ),
        targetQuaternion: new Quaternion().setFromEuler(
          eulerFor(axis.mask, angle, randomSign()),
        ),
        rotationMagnitudeDeg: angle,
        axes: axis.key,
      })
    }
  }

  if (trialSet === 'quick') {
    // Two of each type, keeping one hard combined trial so the demo still shows
    // the condition where DOF-separation matters.
    return [
      ...trials.filter((t) => t.type === 'translation').slice(0, 2),
      ...trials.filter((t) => t.type === 'rotation').slice(0, 2),
      ...trials.filter((t) => t.type === 'combined' && t.rotationMagnitudeDeg === 45).slice(0, 1),
      ...trials.filter((t) => t.type === 'combined' && t.rotationMagnitudeDeg === 135).slice(0, 1),
    ]
  }
  return trials
}

function computeRotationalOffset(a: Quaternion, b: Quaternion): number {
  const dot = Math.abs(a.dot(b))
  const angleRad = 2 * Math.acos(Math.min(dot, 1))
  return (angleRad * 180) / Math.PI
}

export function DockingMode({
  acquisition,
  technique,
  hand,
  objectSize,
  grabDistance,
  cdGain,
}: DockingModeProps) {
  const preset = usePlaygroundTheme()
  const { labAccents, xr, shell } = preset
  const isCloudPark = preset.id === 'cloud-park'
  const joints = useHandJoints(hand)
  const baseTableOffsetY = useInitialEyeLevelOffset({
    referenceY: DESK_SURFACE_Y,
    eyeOffsetFromHead: -TABLE_SURFACE_BELOW_EYE_M,
    desktopOffsetY: DEFAULT_TABLE_OFFSET_Y,
  })
  const [manualTableLiftY, setManualTableLiftY] = useState(0)
  const tableOffsetY = baseTableOffsetY + manualTableLiftY

  // `paper` runs the full 30-trial protocol (6 T + 6 R + 18 combined across the
  // 45/90/135° ladder); `quick` is a 6-trial demo subset.
  const { trialSet } = useControls('Manipulation', {
    trialSet: { value: 'paper' as TrialSet, options: ['paper', 'quick'] },
  })
  const trials = useMemo(() => generateTrials(trialSet as TrialSet), [trialSet])
  // 650 ms hold shows the released (or snapped) pose before the next trial
  // re-seeds the object at the origin.
  const {
    index: trialIndex,
    total: trialsTotal,
    current: currentTrial,
    isComplete,
    records,
    lastRecord,
    currentStartedAt,
    recordResult,
    restart: restartTrials,
  } = useTrialRunner<Trial, DockingTrialResult>({ trials, advanceDelayMs: 650 })
  const pulseHaptic = useHapticPulse()
  const [handProximate, setHandProximate] = useState(false)

  // New Vector3/Quaternion identities per trial so ManipulableObject re-seeds the
  // key crystal at the origin pose when the trial advances — every trial starts
  // from the same place, keeping measurements comparable across techniques.
  const objectOrigin = useMemo(
    () => OBJECT_ORIGIN.clone().add(new Vector3(0, tableOffsetY, 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tableOffsetY, trialIndex],
  )
  const trialStartQuaternion = useMemo(
    () => new Quaternion(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trialIndex],
  )
  const tableHandleAnchor = useMemo(
    () =>
      new Vector3(
        OBJECT_ORIGIN.x + 0.58,
        DESK_SURFACE_Y + baseTableOffsetY + 0.08,
        OBJECT_ORIGIN.z + DESK_PLATFORM_DEPTH * 0.5 + 0.01,
      ),
    [baseTableOffsetY],
  )

  useControls('Manipulation', {
    'restart trials': button(() => restartTrials()),
  })

  const targetPosition = useMemo(
    () =>
      currentTrial
        ? currentTrial.targetPosition.clone().add(new Vector3(0, tableOffsetY, 0))
        : null,
    [currentTrial, tableOffsetY],
  )

  // Acquisition timestamp for the current trial (paper measure: object appears →
  // pinch down). Reset when the trial changes so a stale value can't leak across.
  const acquiredAtRef = useRef<number | null>(null)
  useEffect(() => {
    acquiredAtRef.current = null
  }, [currentStartedAt])

  const onAcquire = useCallback((id: string) => {
    if (id !== 'docking-object') return
    if (acquiredAtRef.current == null) acquiredAtRef.current = performance.now()
  }, [])

  const onRelease = useCallback(
    (id: string, result: ManipulationResult): ManipulationResult | void => {
      if (id !== 'docking-object') return
      if (!currentTrial || !targetPosition) return

      // Preciseness is measured at the moment of release — recorded honestly
      // even when the object then auto-snaps into the dock.
      const positionalOffset = result.position.distanceTo(targetPosition)
      const rotationalOffsetDeg = computeRotationalOffset(
        result.quaternion,
        currentTrial.targetQuaternion,
      )
      // Design-handoff v0.2 Section 04: auto-snap on release when within tight tolerance.
      const withinSnap =
        positionalOffset <= DEFAULTS.docking.snapToleranceM &&
        rotationalOffsetDeg <= DEFAULTS.docking.snapToleranceDeg
      // The runner rejects results while a previous trial's advance hold is
      // pending (re-grab during the 650 ms feedback window) — skip all side
      // effects in that case.
      const releasedAt = performance.now()
      const completionTimeS = (releasedAt - currentStartedAt) / 1000
      const acquisitionTimeS =
        acquiredAtRef.current != null
          ? (acquiredAtRef.current - currentStartedAt) / 1000
          : null
      const accepted = recordResult({
        technique,
        positionalOffset,
        rotationalOffsetDeg,
        completionTimeS,
        acquisitionTimeS,
        snapped: withinSnap,
      })
      if (!accepted) return
      logTrialResult({
        evaluation: 'Docking',
        trialNumber: trialIndex + 1,
        trialsTotal,
        condition: {
          type: currentTrial.type,
          technique,
          acquisition,
          rotationDeg: String(currentTrial.rotationMagnitudeDeg),
          axes: currentTrial.axes,
        },
        measures: {
          positionalOffsetCm: positionalOffset * 100,
          rotationalOffsetDeg,
          completionTimeS,
          ...(acquisitionTimeS != null ? { acquisitionTimeS } : {}),
        },
        flags: { snapped: withinSnap },
        inputSource: 'hand',
      })
      if (withinSnap) {
        // 30 ms success haptic burst per spec.
        pulseHaptic(hand, 0.7, 30)
        // Returned pose is applied by useManipulation to the real object —
        // the release visibly locks into the dock.
        return {
          position: targetPosition.clone(),
          quaternion: currentTrial.targetQuaternion.clone(),
        }
      }
    },
    [
      acquisition,
      currentStartedAt,
      currentTrial,
      hand,
      pulseHaptic,
      recordResult,
      targetPosition,
      technique,
      trialIndex,
      trialsTotal,
    ],
  )

  const { register, state, acquireById, releaseActive } = useManipulation({
    acquisition,
    technique,
    joints,
    cdGain,
    grabDistance,
    onAcquire,
    onRelease,
  })

  // Proximity ring: show a dashed ring on the docking object when the tracked hand
  // comes within ~2× grabDistance of the object (hint zone).
  const objectOriginRef = useRef(new Vector3())
  objectOriginRef.current.copy(objectOrigin)
  useFrame(() => {
    if (!joints.isTracking) {
      if (handProximate) setHandProximate(false)
      return
    }
    const dist = joints.thumbTipPosition.distanceTo(objectOriginRef.current)
    const proximate = dist < grabDistance * 2
    if (proximate !== handProximate) setHandProximate(proximate)
  })

  // "Desk height" / "Bench lift" floating label fades out 60 s after mount so it
  // doesn't sit on top of the scene forever in the desktop preview.
  const heightLabelRef = useRef<{
    fillOpacity?: number
    outlineOpacity?: number
  } | null>(null)
  const heightLabelStartedAt = useRef(performance.now() / 1000)
  useFrame(() => {
    const elapsed = performance.now() / 1000 - heightLabelStartedAt.current
    let opacity = 1
    if (elapsed >= 62) opacity = 0
    else if (elapsed >= 60) opacity = 1 - (elapsed - 60) / 2
    if (heightLabelRef.current) {
      heightLabelRef.current.fillOpacity = opacity
      heightLabelRef.current.outlineOpacity = opacity
    }
  })

  const trialType = currentTrial?.type ?? null
  // In-headset cells report the paper's four measures from the last release
  // rather than restating tuning values the user just set on desktop.
  const last = lastRecord?.result ?? null
  useHudReport(
    {
      metrics: [
        { label: 'TECHNIQUE', value: technique === 'integrated' ? 'INT' : 'SEP' },
        { label: 'POS', value: last ? `${(last.positionalOffset * 100).toFixed(1)}cm` : '—' },
        { label: 'ROT', value: last ? `${last.rotationalOffsetDeg.toFixed(1)}°` : '—' },
        { label: 'TIME', value: last ? `${last.completionTimeS.toFixed(1)}s` : '—' },
      ],
      methodLabel: `Manipulation · Docking · ${acquisition}`,
      trial:
        trialType !== null && currentTrial !== null
          ? {
              current: trialIndex + 1,
              total: trialsTotal,
              subLabel:
                currentTrial.rotationMagnitudeDeg > 0
                  ? `${trialType} ${currentTrial.rotationMagnitudeDeg}° ${currentTrial.axes}`
                  : trialType,
            }
          : null,
    },
    [
      technique,
      acquisition,
      trialIndex,
      trialsTotal,
      trialType,
      currentTrial,
      last,
    ],
  )

  if (isComplete) {
    const avgPos =
      records.reduce((sum, r) => sum + r.result.positionalOffset, 0) / records.length
    const avgRot =
      records.reduce((sum, r) => sum + r.result.rotationalOffsetDeg, 0) / records.length
    const avgTime =
      records.reduce((sum, r) => sum + r.result.completionTimeS, 0) / records.length
    const snappedCount = records.filter((r) => r.result.snapped).length
    // Combined trials at ≥90° are where the paper finds DOF-separation's benefit,
    // so the summary breaks them out — that comparison is the lab's whole point.
    const hardRecords = records.filter(
      (r) => r.trial.type === 'combined' && r.trial.rotationMagnitudeDeg >= 90,
    )
    const hardAvgRot = hardRecords.length
      ? hardRecords.reduce((sum, r) => sum + r.result.rotationalOffsetDeg, 0) /
        hardRecords.length
      : null

    return (
      <group>
        <Text
          position={[0, 1.4, -1]}
          fontSize={0.1}
          color={shell.state.success}
          anchorX="center"
          anchorY="middle"
        >
          {`All ${records.length} trials complete!`}
        </Text>
        <Text
          position={[0, 1.25, -1]}
          fontSize={0.07}
          color={xr.hud.textMuted}
          anchorX="center"
          anchorY="middle"
        >
          {`Avg position ${(avgPos * 100).toFixed(1)}cm · rotation ${avgRot.toFixed(1)}° · time ${avgTime.toFixed(1)}s · snapped ${snappedCount}/${records.length}`}
        </Text>
        {hardAvgRot != null && (
          <Text
            position={[0, 1.16, -1]}
            fontSize={0.055}
            color={xr.hud.textMuted}
            anchorX="center"
            anchorY="middle"
          >
            {`Hard combined (≥90°): ${hardAvgRot.toFixed(1)}° avg rotation offset over ${hardRecords.length} trials — ${technique === 'integrated' ? 'integrated' : 'separated'}`}
          </Text>
        )}
        {/* In-scene restart so the sequence can rerun without leaving the
            headset (Leva's "restart trials" button covers the desktop). */}
        <group position={[0, 1.05, -1]}>
          <mesh
            onPointerDown={(e) => {
              e.stopPropagation()
              restartTrials()
            }}
          >
            <planeGeometry args={[0.42, 0.12]} />
            <meshBasicMaterial
              color={labAccents.manipulation.primary}
              transparent
              opacity={0.25}
            />
          </mesh>
          <Text
            position={[0, 0, 0.001]}
            fontSize={0.05}
            color={xr.hud.textPrimary}
            anchorX="center"
            anchorY="middle"
          >
            Restart trials
          </Text>
        </group>
      </group>
    )
  }

  // currentTrial is only null once the sequence is complete, handled above —
  // this narrows the type for the render below.
  if (!currentTrial) return null

  return (
    <group>
      {/* Target ghost — upright key crystal at dock, with UP arrow visible. */}
      <group
        position={targetPosition ?? currentTrial.targetPosition}
        quaternion={currentTrial.targetQuaternion}
      >
        <KeyCrystal
          objectSize={objectSize}
          variant="ghost"
          solidColor={labAccents.manipulation.primary}
          accentColor={labAccents.manipulation.secondary}
          ghostTint={xr.affordance.dockActive}
        />
      </group>

      {/* Manipulable key crystal + proximity ring hint. */}
      <ManipulableObject
        id="docking-object"
        initialPosition={objectOrigin}
        initialQuaternion={trialStartQuaternion}
        hitHalfExtents={[
          objectSize * 0.3,
          objectSize * 0.55,
          objectSize * 0.2,
        ]}
        register={register}
        isActive={state.isManipulating && state.targetId === 'docking-object'}
        onPointerDown={acquisition === 'ray' ? () => acquireById('docking-object') : undefined}
        onPointerUp={acquisition === 'ray' ? () => releaseActive() : undefined}
      >
        <KeyCrystal
          objectSize={objectSize}
          variant="solid"
          solidColor={labAccents.manipulation.primary}
          accentColor={labAccents.manipulation.secondary}
          active={state.isManipulating}
        />
        {/* Proximity hint — flat ring at 0.75 × objectSize, Phase 2 selection-ring style.
            Material pulse at 1.2 Hz lives inside ProximityRing. */}
        <ProximityRing
          visible={handProximate && !state.isManipulating}
          objectSize={objectSize}
          tint={xr.affordance.proximityRing}
        />
      </ManipulableObject>

      <ManipulableObject
        id="table-height-handle"
        initialPosition={[
          tableHandleAnchor.x,
          tableHandleAnchor.y + manualTableLiftY,
          tableHandleAnchor.z,
        ]}
        hitHalfExtents={[0.08, 0.16, 0.08]}
        register={register}
        constrainResult={(result) => {
          return {
            position: new Vector3(tableHandleAnchor.x, result.position.y, tableHandleAnchor.z),
            quaternion: new Quaternion(),
          }
        }}
        onUpdate={(result) => {
          const nextLift = result.position.y - tableHandleAnchor.y
          setManualTableLiftY((prev) =>
            Math.abs(prev - nextLift) > 0.002 ? nextLift : prev,
          )
        }}
        isActive={state.isManipulating && state.targetId === 'table-height-handle'}
        onPointerDown={
          acquisition === 'ray' ? () => acquireById('table-height-handle') : undefined
        }
        onPointerUp={acquisition === 'ray' ? () => releaseActive() : undefined}
      >
        {isCloudPark ? (
          <CloudParkWorkbenchHandle
            active={state.targetId === 'table-height-handle'}
            stone={xr.accent.stone}
            primary={labAccents.manipulation.primary}
            secondary={labAccents.manipulation.secondary}
          />
        ) : (
          <group>
            {/* Mount foot — visible attachment base. Reads as the bracket
                holding the lever to the desk side. Top edge at y=-0.14. */}
            <mesh position={[0, -0.15, 0]}>
              <cylinderGeometry args={[0.026, 0.032, 0.02, 24]} />
              <meshStandardMaterial color={xr.accent.seal} roughness={0.85} metalness={0.06} />
            </mesh>
            {/* Mount collar — colored ring around the post base. Spans
                y=-0.141..-0.129 so it kisses the foot top and the post bottom. */}
            <mesh position={[0, -0.135, 0]}>
              <cylinderGeometry args={[0.018, 0.022, 0.012, 20]} />
              <meshStandardMaterial color={xr.accent.mustard} roughness={0.5} metalness={0.18} />
            </mesh>
            {/* Lever post — slim metallic shaft. Spans y=-0.13..0.01. */}
            <mesh position={[0, -0.06, 0]}>
              <cylinderGeometry args={[0.0095, 0.011, 0.14, 16]} />
              <meshStandardMaterial color={xr.accent.stone} roughness={0.32} metalness={0.55} />
            </mesh>
            {/* Mid-collar — accent on the shaft mid-section so the knob
                doesn't swallow it. */}
            <mesh position={[0, -0.04, 0]}>
              <cylinderGeometry args={[0.014, 0.014, 0.006, 20]} />
              <meshStandardMaterial color={xr.accent.mustard} roughness={0.45} metalness={0.3} />
            </mesh>
            {/* Knob — true sphere grip, positioned so its bottom slips below
                the post's top edge. Radius 0.032, center at y=0.022 → bottom
                at y=-0.01, post top at 0.01, so the knob clearly sits ON the
                post rather than hovering. */}
            <mesh position={[0, 0.022, 0]}>
              <sphereGeometry args={[0.032, 24, 18]} />
              <meshStandardMaterial
                color={state.targetId === 'table-height-handle' ? labAccents.manipulation.primary : '#ece2d1'}
                roughness={0.24}
                metalness={0.16}
                emissive={labAccents.manipulation.primary}
                emissiveIntensity={state.targetId === 'table-height-handle' ? 0.22 : 0.07}
              />
            </mesh>
          </group>
        )}
      </ManipulableObject>

      <Text
        ref={heightLabelRef}
        position={[
          tableHandleAnchor.x,
          DESK_SURFACE_Y + tableOffsetY + 0.04,
          OBJECT_ORIGIN.z + DESK_PLATFORM_DEPTH * 0.5 + 0.05,
        ]}
        fontSize={0.026}
        color="#f3ead9"
        outlineWidth={0.004}
        outlineColor="#594f43"
        anchorX="center"
        anchorY="middle"
      >
        Desk height
      </Text>

      {/* Release preciseness readout — actual measured offsets, kept even when
          the object auto-snapped (the snap is feedback, not a measurement). */}
      {lastRecord && (
        <Text
          position={[
            OBJECT_ORIGIN.x - 0.58,
            DESK_SURFACE_Y + tableOffsetY + 0.04,
            OBJECT_ORIGIN.z + DESK_PLATFORM_DEPTH * 0.5 + 0.05,
          ]}
          fontSize={0.026}
          color="#f3ead9"
          outlineWidth={0.004}
          outlineColor="#594f43"
          anchorX="center"
          anchorY="middle"
        >
          {`Last: ${(lastRecord.result.positionalOffset * 100).toFixed(1)} cm · ${lastRecord.result.rotationalOffsetDeg.toFixed(1)}° · ${lastRecord.result.completionTimeS.toFixed(1)} s${lastRecord.result.snapped ? ' · snapped' : ''}`}
        </Text>
      )}

      <DockingStation
        objectSize={objectSize}
        stone={xr.accent.stone}
        seal={xr.accent.seal}
        primary={labAccents.manipulation.primary}
        secondary={labAccents.manipulation.secondary}
        offsetY={tableOffsetY}
        isCloudPark={isCloudPark}
      />
      {!isCloudPark && (
        <DeckPlate
          offsetY={tableOffsetY}
          stone={xr.accent.stone}
          seal={xr.accent.seal}
          mustard={xr.accent.mustard}
        />
      )}
    </group>
  )
}
