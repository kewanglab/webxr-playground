/**
 * Per-lab holographic glyphs that mount inside the SharedArch's half-disc. Each glyph
 * is a single decisive mark representing the lab's interaction core. Colors come from
 * `xr.arch.rim` (primary) and `xr.arch.rimSoft` (secondary) so each holo reads as the
 * theme it lives in (Warm Night = ember, Cloud Park = amber) while the per-lab shape
 * carries identity. `MountainHolo` is the default for labs that haven't picked a glyph.
 */
import type { LabId } from '../../../config/labs'
import type { ComponentType } from 'react'
import { LocomotionHolo } from './LocomotionHolo'
import { ManipulationHolo } from './ManipulationHolo'
import { MountainHolo } from './MountainHolo'
import { PlacementHolo } from './PlacementHolo'
import { SelectionHolo } from './SelectionHolo'

export { LocomotionHolo } from './LocomotionHolo'
export { ManipulationHolo } from './ManipulationHolo'
export { MountainHolo } from './MountainHolo'
export { PlacementHolo } from './PlacementHolo'
export { SelectionHolo } from './SelectionHolo'

/**
 * Map of lab → its chosen holo component. Falls back to `MountainHolo` for any
 * lab id that hasn't been assigned a glyph yet.
 */
export const labHolos: Record<LabId, ComponentType> = {
  selection: SelectionHolo,
  manipulation: ManipulationHolo,
  locomotion: LocomotionHolo,
  placement: PlacementHolo,
  microgesture: MountainHolo,
}

/** Resolve the holo for a lab id, returning the default if none is registered. */
export function getLabHolo(labId: LabId | undefined | null): ComponentType {
  if (!labId) return MountainHolo
  return labHolos[labId] ?? MountainHolo
}
