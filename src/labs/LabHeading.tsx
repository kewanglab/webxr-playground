import { Text } from '@react-three/drei'

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
  return (
    <group>
      <Text
        position={[0, 1.8, -2]}
        fontSize={0.12}
        color="#888"
        anchorX="center"
        anchorY="middle"
      >
        {title}
      </Text>
      <Text
        position={[0, 1.64, -2]}
        fontSize={0.065}
        color="#666"
        anchorX="center"
        anchorY="middle"
      >
        {subtitle}
      </Text>
    </group>
  )
}
