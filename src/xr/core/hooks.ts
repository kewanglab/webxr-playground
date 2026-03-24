import { useXR } from '@react-three/xr'

export function useXRMode() {
  return useXR((xr) => xr.mode)
}

export function useIsAR() {
  return useXR((xr) => xr.mode === 'immersive-ar')
}

export function useIsVR() {
  return useXR((xr) => xr.mode === 'immersive-vr')
}

export function useIsInXR() {
  return useXR((xr) => xr.mode != null)
}
