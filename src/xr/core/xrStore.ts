import { createXRStore } from '@react-three/xr'

export const defaultXRHandConfig = {
  rayPointer: true,
  touchPointer: true,
  grabPointer: true,
  teleportPointer: true,
  model: true,
}

export const defaultXRControllerConfig = {
  rayPointer: true,
  grabPointer: true,
  teleportPointer: true,
  model: true,
}

export const xrStore = createXRStore({
  // metaQuest3 emulation is enabled by default on localhost
  // hand tracking, hit test, plane detection all enabled by default
  foveation: 0,
  hand: defaultXRHandConfig,
  controller: defaultXRControllerConfig,
})

export function resetXRInputDefaults() {
  xrStore.setHand({ ...defaultXRHandConfig })
  xrStore.setController({ ...defaultXRControllerConfig })
}
