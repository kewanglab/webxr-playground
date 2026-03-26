import { create } from 'zustand'
import { Vector3 } from 'three'
import type { LabId } from '../config/labs'

type PlaygroundState = {
  currentLab: LabId
  setLab: (lab: LabId) => void
  originPosition: Vector3
  setOriginPosition: (pos: Vector3) => void
  originRotationY: number
  setOriginRotationY: (yRadians: number) => void
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  currentLab: 'selection',
  setLab: (lab) => set({ currentLab: lab }),
  // Session origin transform controlled by locomotion and teleport labs.
  originPosition: new Vector3(0, 0, 0),
  setOriginPosition: (pos) => set({ originPosition: pos }),
  originRotationY: 0,
  setOriginRotationY: (yRadians) => set({ originRotationY: yRadians }),
}))
