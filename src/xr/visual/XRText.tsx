import { Text as DreiText } from '@react-three/drei'
import { forwardRef, type ComponentProps } from 'react'

/**
 * Self-hosted font for all in-scene text. Without an explicit `font`, troika
 * resolves fonts at runtime from a CDN (cdn.jsdelivr.net unicode-font-resolver)
 * and drei's `<Text>` suspends on that fetch — on a network-restricted device
 * the whole scene Suspense never resolves and the canvas stays black.
 * DM Sans matches the design system (docs/design-handoff/skill.md §3).
 */
export const XR_TEXT_FONT = '/assets/fonts/DMSans-Regular.ttf'

/** Project `<Text>` — drei's Text with the self-hosted font applied. */
export const Text = forwardRef<
  React.ComponentRef<typeof DreiText>,
  ComponentProps<typeof DreiText>
>(function XRText(props, ref) {
  return <DreiText ref={ref} font={XR_TEXT_FONT} {...props} />
}) as typeof DreiText
