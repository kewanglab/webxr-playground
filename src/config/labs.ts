export type XRMode = 'vr' | 'ar' | 'cross-xr'
export type LabId = 'selection' | 'placement' | 'locomotion' | 'manipulation'

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
]

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
    shoulderOffsetRight: [-0.15, -0.35, -0.1] as [number, number, number],
    docking: {
      translationOffsetM: 0.3,
      rotationOffsetDeg: 45,
    },
  },
}
