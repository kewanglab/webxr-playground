import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
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

/** Seconds the heading stays at full opacity before it begins fading out. */
const FADE_START_S = 60
/** How long the fade itself lasts, in seconds. */
const FADE_DURATION_S = 2

/**
 * Standard in-scene header for every lab: title (name) + subtitle (configuration).
 * Sits in the SharedArch's plane, centered in the doorway between the pillars.
 *
 * Fades out 60 s after mount so the desktop preview doesn't carry the heading
 * indefinitely. Re-enter the lab (or refresh) to see it again.
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

  const titleRef = useRef<{ fillOpacity?: number; outlineOpacity?: number } | null>(null)
  const subtitleRef = useRef<{ fillOpacity?: number; outlineOpacity?: number } | null>(null)
  const startedAt = useRef(performance.now() / 1000)

  useFrame(() => {
    const elapsed = performance.now() / 1000 - startedAt.current
    let opacity = 1
    if (elapsed >= FADE_START_S + FADE_DURATION_S) {
      opacity = 0
    } else if (elapsed >= FADE_START_S) {
      opacity = 1 - (elapsed - FADE_START_S) / FADE_DURATION_S
    }
    if (titleRef.current) {
      titleRef.current.fillOpacity = opacity
      titleRef.current.outlineOpacity = opacity
    }
    if (subtitleRef.current) {
      subtitleRef.current.fillOpacity = opacity
      subtitleRef.current.outlineOpacity = opacity
    }
  })

  return (
    <group position={archPosition}>
      <Text
        ref={titleRef}
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
        ref={subtitleRef}
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
