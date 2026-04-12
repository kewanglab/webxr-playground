import { Text } from '@react-three/drei'
import { usePlaygroundTheme } from '../xr/theme/PlaygroundThemeContext'

export type LabHeadingProps = {
  /** Lab name only (e.g. from `getLabTitle`). */
  title: string
  /** Leva-driven or mode summary; keep concise for headset readability. */
  subtitle: string
}

/**
 * Standard in-scene header for every lab: title (name) + subtitle (configuration).
 * Positions match across labs so switching experiments feels consistent.
 */
export function LabHeading({ title, subtitle }: LabHeadingProps) {
  const { xr } = usePlaygroundTheme()
  return (
    <group>
      <Text
        position={[0, 1.8, -2]}
        fontSize={0.12}
        color={xr.hud.textMuted}
        anchorX="center"
        anchorY="middle"
      >
        {title}
      </Text>
      <Text
        position={[0, 1.64, -2]}
        fontSize={0.065}
        color={xr.accent.stone}
        anchorX="center"
        anchorY="middle"
      >
        {subtitle}
      </Text>
    </group>
  )
}
