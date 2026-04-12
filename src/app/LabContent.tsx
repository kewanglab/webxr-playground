import { usePlaygroundStore } from './store'
import { SelectionLab } from '../labs/cross-xr/SelectionLab'
import { PlacementLab } from '../labs/ar/PlacementLab'
import { LocomotionLab } from '../labs/vr/LocomotionLab'
import { ObjectManipulationLab } from '../labs/cross-xr/ObjectManipulationLab'

export function LabContent() {
  const currentLab = usePlaygroundStore((s) => s.currentLab)

  switch (currentLab) {
    case 'selection':
      return <SelectionLab />
    case 'placement':
      return <PlacementLab />
    case 'locomotion':
      return <LocomotionLab />
    case 'manipulation':
      return <ObjectManipulationLab />
  }
}
