import { useFrame, useThree } from '@react-three/fiber'
import { useXR } from '@react-three/xr'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Vector3 } from 'three'

type EyeLevelOffsetOptions = {
  referenceY: number
  eyeOffsetFromHead: number
  desktopOffsetY?: number
}

export function useInitialEyeLevelOffset({
  referenceY,
  eyeOffsetFromHead,
  desktopOffsetY = 0,
}: EyeLevelOffsetOptions) {
  const { camera } = useThree()
  const session = useXR((state) => state.session)
  const worldPosition = useMemo(() => new Vector3(), [])
  const capturedSessionRef = useRef<XRSession | null>(null)
  const [offsetY, setOffsetY] = useState(desktopOffsetY)

  useEffect(() => {
    if (!session) {
      capturedSessionRef.current = null
      setOffsetY(desktopOffsetY)
      return
    }

    capturedSessionRef.current = null
  }, [desktopOffsetY, session])

  useFrame(() => {
    if (!session || capturedSessionRef.current === session) return

    camera.getWorldPosition(worldPosition)
    if (!Number.isFinite(worldPosition.y) || worldPosition.y < 0.4) return

    const nextOffset = worldPosition.y + eyeOffsetFromHead - referenceY
    setOffsetY(nextOffset)
    capturedSessionRef.current = session
  })

  return offsetY
}
