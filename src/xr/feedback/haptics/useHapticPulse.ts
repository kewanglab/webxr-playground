import { useXRInputSourceState } from '@react-three/xr'

export function useHapticPulse() {
  const left = useXRInputSourceState('controller', 'left')
  const right = useXRInputSourceState('controller', 'right')

  return (handedness: 'left' | 'right' = 'right', intensity = 0.5, durationMs = 60) => {
    const controller = handedness === 'left' ? left : right
    const gamepad = controller?.inputSource.gamepad as Gamepad | null | undefined
    gamepad?.hapticActuators?.[0]?.pulse(intensity, durationMs)
  }
}
