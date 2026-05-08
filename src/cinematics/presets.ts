import type { Keyframe } from './director'
import { conceptA } from './conceptA'
import { conceptB } from './conceptB'

export const directorPresets: Record<string, Keyframe[]> = {
  'concept-a': conceptA,
  'concept-b': conceptB,
}

export function getDirectorPreset(id: string): Keyframe[] | null {
  return directorPresets[id] ?? null
}
