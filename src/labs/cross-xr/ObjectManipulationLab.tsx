import { Text } from '@react-three/drei'
import { useControls } from 'leva'
import { useEffect } from 'react'
import { tuningPresets } from '../../config/labs'
import { xrStore } from '../../xr/core/xrStore'
import { DockingMode } from './manipulation/DockingMode'
import { ZenGardenMode } from './manipulation/ZenGardenMode'

export type ManipulationTechnique = 'VHI' | 'VHS' | 'HRI' | 'HRS'

const techniqueLabels: Record<ManipulationTechnique, string> = {
  VHI: 'Virtual Hand — Integrated',
  VHS: 'Virtual Hand — Separated',
  HRI: 'Hand Ray — Integrated',
  HRS: 'Hand Ray — Separated',
}

export function ObjectManipulationLab() {
  const defaults = tuningPresets.manipulation

  // Disable the default hand ray and teleport pointers while in this lab
  // to avoid a duplicate ray. Our custom RayVisual handles technique-specific rays.
  useEffect(() => {
    xrStore.setHand({ rayPointer: false, teleportPointer: false })
    return () => {
      xrStore.setHand({ rayPointer: true, teleportPointer: true })
    }
  }, [])

  const { labMode, technique, objectSize, grabDistance, cdGain } = useControls(
    'Manipulation',
    {
      labMode: { value: 'docking' as 'docking' | 'zen', options: ['docking', 'zen'] },
      technique: {
        value: 'VHI' as ManipulationTechnique,
        options: {
          [techniqueLabels.VHI]: 'VHI',
          [techniqueLabels.VHS]: 'VHS',
          [techniqueLabels.HRI]: 'HRI',
          [techniqueLabels.HRS]: 'HRS',
        },
      },
      objectSize: { value: defaults.objectSize, min: 0.05, max: 0.3, step: 0.01 },
      grabDistance: { value: defaults.grabDistance, min: 0.02, max: 0.2, step: 0.01 },
      cdGain: { value: defaults.cdGain, min: 0.2, max: 3.0, step: 0.1 },
    },
  )

  return (
    <group>
      <Text
        position={[0, 1.8, -2]}
        fontSize={0.12}
        color="#888"
        anchorX="center"
        anchorY="middle"
      >
        {`Manipulation Lab — ${techniqueLabels[technique as ManipulationTechnique]}`}
      </Text>

      <Text
        position={[0, 1.65, -2]}
        fontSize={0.07}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        {labMode === 'docking'
          ? 'Docking Mode — match target position and rotation'
          : 'Zen Garden — free arrangement'}
      </Text>

      {labMode === 'docking' ? (
        <DockingMode
          technique={technique as ManipulationTechnique}
          objectSize={objectSize}
          grabDistance={grabDistance}
          cdGain={cdGain}
        />
      ) : (
        <ZenGardenMode
          technique={technique as ManipulationTechnique}
          objectSize={objectSize}
          grabDistance={grabDistance}
          cdGain={cdGain}
        />
      )}
    </group>
  )
}
