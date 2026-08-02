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

/**
 * Who owns device emulation.
 *
 * By default `@react-three/xr` installs its own IWER device when the page is
 * on `localhost` and WebXR is unsupported. Under `npm run dev:agent` the
 * `iwsdkDev` plugin has already installed one from an injected `<head>`
 * script, before any app module evaluates — two runtimes racing to own
 * `navigator.xr`.
 *
 * In practice r3xr's injector already backs off (it probes
 * `isSessionSupported` first and bails when a runtime answers), but that
 * probe is async and the outcome depends on which side wins the frame. The
 * agent harness is a measurement tool; "usually deconflicts" is not good
 * enough. `emulate: false` in agent mode makes the handoff explicit, and
 * leaves plain `npm run dev` exactly as it was.
 */
const pluginOwnsEmulation = import.meta.env.MODE === 'agent'

export const xrStore = createXRStore({
  // metaQuest3 emulation is enabled by default on localhost
  // hand tracking, hit test, plane detection all enabled by default
  ...(pluginOwnsEmulation ? { emulate: false as const } : {}),
  foveation: 0,
  hand: defaultXRHandConfig,
  controller: defaultXRControllerConfig,
})

export function resetXRInputDefaults() {
  xrStore.setHand({ ...defaultXRHandConfig })
  xrStore.setController({ ...defaultXRControllerConfig })
}
