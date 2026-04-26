import { createContext, useContext, type ReactNode } from 'react'
import {
  getPlaygroundPreset,
  type PlaygroundThemePreset,
} from '../../config/playgroundTheme'

const PlaygroundThemeContext = createContext<PlaygroundThemePreset | null>(null)

type PlaygroundThemeProviderProps = {
  presetId: string
  children: ReactNode
}

export function PlaygroundThemeProvider({
  presetId,
  children,
}: PlaygroundThemeProviderProps) {
  const preset = getPlaygroundPreset(presetId)
  return (
    <PlaygroundThemeContext.Provider value={preset}>
      {children}
    </PlaygroundThemeContext.Provider>
  )
}

export function usePlaygroundTheme(): PlaygroundThemePreset {
  const ctx = useContext(PlaygroundThemeContext)
  if (!ctx) {
    throw new Error('usePlaygroundTheme must be used inside PlaygroundThemeProvider')
  }
  return ctx
}
