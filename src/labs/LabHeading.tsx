import { Text } from '@react-three/drei'
import { usePlaygroundTheme } from '../xr/theme/PlaygroundThemeContext'
import { GATEWAY_SCALE, LEG_H } from '../xr/visual/SharedScenery'

export type LabHeadingProps = {
  /** Lab name only (e.g. from `getLabTitle`). */
  title: string
  /** Leva-driven or mode summary; keep concise for headset readability. */
  subtitle: string
  /**
   * World position of the SharedArch this heading belongs to. The title and
   * subtitle render in the arch's vertical plane (same z), centered horizontally,
   * and vertically centered inside the rectangular doorway opening between the
   * two supporting pillars (y = 0 to y = LEG_H * GATEWAY_SCALE).
   */
  archPosition?: [number, number, number]
}

/**
 * Standard in-scene header for every lab: title (name) + subtitle (configuration).
 * Sits in the SharedArch's plane, centered in the doorway between the pillars.
 */
export function LabHeading({
  title,
  subtitle,
  archPosition = [0, 0, -2.5],
}: LabHeadingProps) {
  const { xr } = usePlaygroundTheme()

  // Doorway opening: floor (y=0) to pillar top (y = LEG_H * GATEWAY_SCALE).
  // Center the title/subtitle pair vertically within that rectangle.
  const doorwayTopY = LEG_H * GATEWAY_SCALE
  const centerY = doorwayTopY / 2
  const pairHalfSpan = 0.08 // half the visual gap between title baseline and subtitle baseline

  return (
    <group position={archPosition}>
      <Text
        position={[0, centerY + pairHalfSpan, 0]}
        fontSize={0.12}
        color={xr.hud.textPrimary}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.006}
        outlineColor={xr.void.clear}
      >
        {title}
      </Text>
      <Text
        position={[0, centerY - pairHalfSpan, 0]}
        fontSize={0.065}
        color={xr.hud.textMuted}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.003}
        outlineColor={xr.void.clear}
      >
        {subtitle}
      </Text>
    </group>
  )
}
