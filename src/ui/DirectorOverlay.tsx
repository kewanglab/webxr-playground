import { useDirectorStore } from '../cinematics/directorStore'
import './directorOverlay.css'

/**
 * DOM-layer Director-mode chrome:
 *  - Caption lower-third with crossfade on text change.
 *  - Full-screen black fade panel driven by `fadeOpacity` (0 = clear, 1 = black)
 *    so keyframes can dip-to-black between scenes without touching the canvas.
 *
 * Both panels are `pointer-events: none` so they never interfere with the scene.
 */
export function DirectorOverlay() {
  const caption = useDirectorStore((s) => s.caption)
  const fadeOpacity = useDirectorStore((s) => s.fadeOpacity)
  // Captions hide while the screen is mostly dark — otherwise text reading
  // through a half-faded scene jitters and reads as a glitch instead of a cut.
  const captionVisible = caption != null && fadeOpacity < 0.4
  return (
    <>
      <div
        className="director-overlay"
        data-visible={captionVisible ? 'true' : 'false'}
      >
        <div className="director-overlay__caption" key={caption ?? 'empty'}>
          {caption}
        </div>
      </div>
      <div
        className="director-overlay__fade"
        style={{ opacity: fadeOpacity }}
        aria-hidden="true"
      />
    </>
  )
}
