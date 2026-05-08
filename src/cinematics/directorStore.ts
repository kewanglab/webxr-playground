import { create } from 'zustand'

/**
 * Runtime state surfaced by the active Director timeline so the caption
 * lower-third (a DOM overlay outside the Canvas) can render in sync with the
 * `useFrame`-driven camera animator.
 */
export type DirectorRuntimeState = {
  caption: string | null
  setCaption: (caption: string | null) => void
  /** 0 = clear, 1 = fully black; drives the full-screen fade overlay. */
  fadeOpacity: number
  setFadeOpacity: (opacity: number) => void
}

export const useDirectorStore = create<DirectorRuntimeState>((set) => ({
  caption: null,
  setCaption: (caption) => set({ caption }),
  fadeOpacity: 0,
  setFadeOpacity: (fadeOpacity) => set({ fadeOpacity }),
}))
