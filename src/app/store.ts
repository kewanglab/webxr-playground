import { create } from 'zustand'
import type { LabId } from '../config/labs'

type PlaygroundState = {
  currentLab: LabId
  setLab: (lab: LabId) => void
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  currentLab: 'selection',
  setLab: (lab) => set({ currentLab: lab }),
}))
