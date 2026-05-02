import { IfInSessionMode } from '@react-three/xr'
import { useControls } from 'leva'
import { useEffect } from 'react'
import { getLabTitle, tuningPresets } from '../../config/labs'
import { LabHeading } from '../LabHeading'
import {
  defaultXRHandConfig,
  resetXRInputDefaults,
  xrStore,
} from '../../xr/core/xrStore'
import { ManipulationHolo } from '../../xr/visual/holos'
import { SharedArch, StagePlatform } from '../../xr/visual/SharedScenery'
import { DockingMode } from './manipulation/DockingMode'
import { ZenGardenMode } from './manipulation/ZenGardenMode'

export type ManipulationTechnique = 'integrated' | 'separated'
export type ManipulationAcquisition = 'proximity' | 'ray'

const techniqueLabels: Record<ManipulationTechnique, string> = {
  integrated: 'Integrated (6DOF)',
  separated: 'Separated (translation + rotation)',
}
const acquisitionLabels: Record<ManipulationAcquisition, string> = {
  proximity: 'Proximity pinch',
  ray: 'Hand ray',
}

const labModeLabels: Record<'docking' | 'zen', string> = {
  docking: 'Docking',
  zen: 'Zen garden',
}

export function ObjectManipulationLab() {
  const defaults = tuningPresets.manipulation

  const { labMode, acquisition, technique, objectSize, grabDistance, cdGain } = useControls(
    'Manipulation',
    {
      labMode: { value: 'docking' as 'docking' | 'zen', options: ['docking', 'zen'] },
      acquisition: {
        value: 'proximity' as ManipulationAcquisition,
        options: {
          [acquisitionLabels.proximity]: 'proximity',
          [acquisitionLabels.ray]: 'ray',
        },
      },
      technique: {
        value: 'integrated' as ManipulationTechnique,
        options: {
          [techniqueLabels.integrated]: 'integrated',
          [techniqueLabels.separated]: 'separated',
        },
      },
      objectSize: { value: defaults.objectSize, min: 0.05, max: 0.3, step: 0.01 },
      grabDistance: { value: defaults.grabDistance, min: 0.02, max: 0.2, step: 0.01 },
      cdGain: { value: defaults.cdGain, min: 0.2, max: 3.0, step: 0.1 },
    },
  )

  useEffect(() => {
    xrStore.setHand({
      ...defaultXRHandConfig,
      rayPointer: acquisition === 'ray',
      grabPointer: false,
      teleportPointer: false,
    })
    return () => {
      resetXRInputDefaults()
    }
  }, [acquisition])

  return (
    <group>
      <LabHeading
        title={getLabTitle('manipulation')}
        subtitle={`${labModeLabels[labMode as 'docking' | 'zen']} · ${acquisitionLabels[acquisition as ManipulationAcquisition]} · ${techniqueLabels[technique as ManipulationTechnique]}`}
        archPosition={[0, 0, -2.5]}
      />
      <IfInSessionMode deny="immersive-ar">
        <SharedArch position={[0, 0, -2.5]} holo={<ManipulationHolo />} />
        <StagePlatform position={[0, 0, -2.5]} />
      </IfInSessionMode>

      {labMode === 'docking' ? (
        <DockingMode
          acquisition={acquisition as ManipulationAcquisition}
          technique={technique as ManipulationTechnique}
          objectSize={objectSize}
          grabDistance={grabDistance}
          cdGain={cdGain}
        />
      ) : (
        <ZenGardenMode
          acquisition={acquisition as ManipulationAcquisition}
          technique={technique as ManipulationTechnique}
          objectSize={objectSize}
          grabDistance={grabDistance}
          cdGain={cdGain}
        />
      )}
    </group>
  )
}
