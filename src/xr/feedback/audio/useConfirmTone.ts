import { useRef } from 'react'

export function useConfirmTone() {
  const contextRef = useRef<AudioContext | null>(null)

  return (frequency = 660, durationMs = 80) => {
    if (typeof window === 'undefined') return
    if (!contextRef.current) {
      contextRef.current = new AudioContext()
    }
    const ctx = contextRef.current
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.value = 0.0001

    oscillator.connect(gain)
    gain.connect(ctx.destination)

    const now = ctx.currentTime
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)

    oscillator.start(now)
    oscillator.stop(now + durationMs / 1000)
  }
}
