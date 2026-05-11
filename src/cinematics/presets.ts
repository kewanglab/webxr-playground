import type { Keyframe } from './director'
import { conceptB } from './conceptB'

export const directorPresets: Record<string, Keyframe[]> = {
  'concept-b': conceptB,
}

export function getDirectorPreset(id: string): Keyframe[] | null {
  return directorPresets[id] ?? null
}
