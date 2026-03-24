import { XR, XROrigin } from '@react-three/xr'
import { xrStore } from './xrStore'
import { useXRMode } from './hooks'
import { SharedScene } from '../scene/SharedScene'
import { VRScene } from '../scene/VRScene'
import { ARScene } from '../scene/ARScene'
import { LabContent } from '../../app/LabContent'

function XRScene() {
  const mode = useXRMode()
  const isAR = mode === 'immersive-ar'

  return (
    <>
      <XROrigin />
      <SharedScene />
      {!isAR && <VRScene />}
      {isAR && <ARScene />}
      <LabContent />
    </>
  )
}

export function XRRoot() {
  return (
    <XR store={xrStore}>
      <XRScene />
    </XR>
  )
}
