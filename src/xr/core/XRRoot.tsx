import { Suspense, useEffect } from 'react'
import { XR, XROrigin } from '@react-three/xr'
import { xrStore } from './xrStore'
import { useXRMode } from './hooks'
import { SharedScene } from '../scene/SharedScene'
import { VRScene } from '../scene/VRScene'
import { ARScene } from '../scene/ARScene'
import { LabContent } from '../../app/LabContent'
import { usePlaygroundStore } from '../../app/store'
import { InXRStats } from '../hud/InXRStats'
import { HUDPanel } from '../hud/HUDPanel'
import { TagAlongHUD } from '../hud/TagAlongHUD'
import { preloadXrKitModels } from '../visual/useKitModel'
import { DesktopPreviewCamera } from './DesktopPreviewCamera'

function XRScene() {
  const mode = useXRMode()
  const isAR = mode === 'immersive-ar'
  const originPosition = usePlaygroundStore((s) => s.originPosition)
  const originRotationY = usePlaygroundStore((s) => s.originRotationY)

  return (
    <>
      <DesktopPreviewCamera />
      <XROrigin position={originPosition} rotation={[0, originRotationY, 0]} />
      <SharedScene />
      {!isAR && <VRScene />}
      {isAR && <ARScene />}
      <LabContent />
    </>
  )
}

export function XRRoot() {
  const fpsHudVisible = usePlaygroundStore((s) => s.fpsHudVisible)

  useEffect(() => {
    preloadXrKitModels()
  }, [])

  return (
    <XR store={xrStore}>
      <Suspense fallback={null}>
        <XRScene />
      </Suspense>
      {fpsHudVisible && (
        <TagAlongHUD>
          <HUDPanel>
            <InXRStats />
          </HUDPanel>
        </TagAlongHUD>
      )}
    </XR>
  )
}
