export type XRMode = 'vr' | 'ar' | 'cross-xr'
export type LabId =
  | 'selection'
  | 'placement'
  | 'locomotion'
  | 'manipulation'
  | 'microgesture'

export type LabDefinition = {
  id: LabId
  name: string
  mode: XRMode
  description: string
}

export const labs: LabDefinition[] = [
  {
    id: 'selection',
    name: 'Selection Lab',
    mode: 'cross-xr',
    description: 'Compare selection via ray, direct touch, and hand pinch',
  },
  {
    id: 'placement',
    name: 'Placement Lab',
    mode: 'ar',
    description: 'Place objects on detected surfaces using hit-test',
  },
  {
    id: 'locomotion',
    name: 'Locomotion Lab',
    mode: 'vr',
    description: 'Teleport, smooth movement, and turning systems',
  },
  {
    id: 'manipulation',
    name: 'Manipulation Lab',
    mode: 'cross-xr',
    description:
      'DOF-Separation for 3D object manipulation — compare Virtual Hand and Hand Ray with integrated vs separated translation/rotation',
  },
  {
    id: 'microgesture',
    name: 'Microgesture Lab',
    mode: 'cross-xr',
    description:
      'Meta-style hand microgestures — thumb tap on the middle of the index finger selects; side-of-index swipes turn and step the player.',
  },
]

export function isValidLabId(id: string): id is LabId {
  return labs.some((lab) => lab.id === id)
}

/** Stable scene title for each lab (use with `LabHeading`). */
export function getLabTitle(id: LabId): string {
  const lab = labs.find((l) => l.id === id)
  return lab?.name ?? id
}

/**
 * Selection Lab target positions in world meters — design-handoff v0.2 Section 04.
 * Ray target sits alone at far eye-level distance (across-the-room feel).
 * Pinch + Touch paired symmetric at arm's reach, just below eye level.
 */
export const selectionTargetPositions: Record<
  'ray' | 'pinch' | 'touch',
  [number, number, number]
> = {
  ray: [0, 1.6, -2.2],
  pinch: [-0.3, 1.35, -0.55],
  touch: [0.3, 1.35, -0.55],
}

export const tuningPresets = {
  controller: {
    selection: {
      targetSize: 0.28,
      confirmScaleBoost: 0.15,
      enableHaptics: true,
      enableAudio: false,
    },
    placement: {
      objectSize: 0.12,
      previewOpacity: 0.4,
      enableHaptics: true,
      enableAudio: false,
    },
    locomotion: {
      stickHand: 'right' as const,
      moveSpeed: 1.8,
      moveDeadzone: 0.2,
      turnDeadzone: 0.5,
      turnMode: 'snap' as const,
      snapTurnAngleDeg: 45,
      smoothTurnSpeedDeg: 90,
    },
  },
  hand: {
    selection: {
      targetSize: 0.32,
      confirmScaleBoost: 0.18,
      enableHaptics: false,
      enableAudio: false,
    },
    placement: {
      objectSize: 0.14,
      previewOpacity: 0.5,
      enableHaptics: false,
      enableAudio: false,
    },
  },
  manipulation: {
    objectSize: 0.125,
    grabDistance: 0.08,
    cdGain: 1.0,
    docking: {
      /** Trial target offset from origin (how far the user must move the object). */
      translationOffsetM: 0.3,
      /** Trial target rotation (how much the user must rotate to match). */
      rotationOffsetDeg: 45,
      /**
       * On-release snap tolerance per design-handoff v0.2 Section 04.
       * When the released object is within both the position and rotation
       * tolerances of the trial target, it auto-aligns to the target and the
       * trial counts as a snapped success. Tight values produce a skill-based
       * "lock" feel instead of a forgiving vacuum.
       */
      snapToleranceM: 0.04,
      snapToleranceDeg: 10,
    },
  },
}
