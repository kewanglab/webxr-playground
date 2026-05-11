import { create } from 'zustand'

/**
 * Runtime state surfaced by the active Director timeline so the caption
 * lower-third (a DOM overlay outside the Canvas) can render in sync with the
 * `useFrame`-driven camera animator.
 */
export type DirectorRuntimeState = {
  caption: string | null
  /**
   * When true, the caption renders even while the fade overlay is mostly
   * opaque — used for captions meant to sit on top of inter-scene
   * blackouts (e.g. a title that persists across establishing shots).
   */
  captionPersistent: boolean
  setCaption: (caption: string | null, persistent?: boolean) => void
  /** 0 = clear, 1 = fully black; drives the full-screen fade overlay. */
  fadeOpacity: number
  setFadeOpacity: (opacity: number) => void
}

export const useDirectorStore = create<DirectorRuntimeState>((set) => ({
  caption: null,
  captionPersistent: false,
  setCaption: (caption, persistent = false) =>
    set({ caption, captionPersistent: persistent }),
  fadeOpacity: 0,
  setFadeOpacity: (fadeOpacity) => set({ fadeOpacity }),
}))
