import { createXRStore } from '@react-three/xr'

export const xrStore = createXRStore({
  // metaQuest3 emulation is enabled by default on localhost
  // hand tracking, hit test, plane detection all enabled by default
  foveation: 0,
  // Needed for VR teleportation via <TeleportTarget>
  hand: {
    teleportPointer: true,
  },
  controller: {
    teleportPointer: true,
  },
})
