export type XRMode = 'vr' | 'ar' | 'cross-xr'
export type LabId = 'selection' | 'placement' | 'locomotion'

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
]
