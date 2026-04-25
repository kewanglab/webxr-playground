import { Text } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Shape } from 'three'
import { useConfirmTone } from '../feedback/audio/useConfirmTone'
import { useHapticPulse } from '../feedback/haptics/useHapticPulse'
import { usePlaygroundTheme } from '../theme/PlaygroundThemeContext'

/**
 * In-XR HUD per design-handoff v0.2 — minimized FPS pill that taps to expand into a metrics panel.
 * Dimensions follow the spec's HUD_DIMS in CSS px, mapped to world meters via the PX constant.
 * Tap-to-toggle uses controller-ray pointer events (R3F default), with haptic + tone feedback.
 *
 * Bordered look: rounded-rect border ring (theme accent) wrapping the inset rounded fill.
 * "Shadow blur" glow from the spec is approximated by the border emissive — true bloom would
 * need a post-process pass (Phase 8 polish).
 */

// Spec px → world metres. Tuned so the expanded panel reads big without dominating at the
// TagAlongHUD scale (0.62).
const PX = 0.00125

const FPS_SAMPLE_FRAMES = 30
const FPS_UI_INTERVAL_S = 0.35

function getFpsColor(fps: number): string {
  if (fps >= 90) return '#6f9e78'
  if (fps >= 72) return '#d8b56d'
  if (fps >= 45) return '#c9794d'
  return '#b64f4a'
}

function useFpsLabel(): { label: string; color: string } {
  const [label, setLabel] = useState('—')
  const [color, setColor] = useState('#6f9e78')
  const accInverseDelta = useRef(0)
  const samples = useRef(0)
  const sinceUi = useRef(0)

  useFrame((_, delta) => {
    const d = Math.max(delta, 1e-4)
    accInverseDelta.current += 1 / d
    samples.current += 1
    sinceUi.current += delta
    if (samples.current >= FPS_SAMPLE_FRAMES && sinceUi.current >= FPS_UI_INTERVAL_S) {
      const avg = accInverseDelta.current / samples.current
      setLabel(avg.toFixed(0))
      setColor(getFpsColor(avg))
      accInverseDelta.current = 0
      samples.current = 0
      sinceUi.current = 0
    }
  })

  return { label, color }
}

/** Build a flat rounded-rectangle Shape for `<shapeGeometry>`. */
function roundedRectShape(w: number, h: number, r: number): Shape {
  const s = new Shape()
  const rx = Math.min(r, w / 2)
  const ry = Math.min(r, h / 2)
  s.moveTo(-w / 2 + rx, h / 2)
  s.lineTo(w / 2 - rx, h / 2)
  s.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - ry)
  s.lineTo(w / 2, -h / 2 + ry)
  s.quadraticCurveTo(w / 2, -h / 2, w / 2 - rx, -h / 2)
  s.lineTo(-w / 2 + rx, -h / 2)
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2, -h / 2 + ry)
  s.lineTo(-w / 2, h / 2 - ry)
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2 + rx, h / 2)
  return s
}

export function HUDPanel() {
  const { xr } = usePlaygroundTheme()
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const pulse = useHapticPulse()
  const playTone = useConfirmTone()
  const { label: fpsLabel, color: fpsColor } = useFpsLabel()

  // Half-opaque idle, full opacity on hover.
  const opacityMult = hovered ? 1 : 0.5

  // Minimized pill is narrowed since content is reduced to status dot + FPS only.
  // Expanded panel keeps the spec's 295×168 px / r=13 dimensions.
  const W = (expanded ? 295 : 90) * PX
  const H = (expanded ? 168 : 38) * PX
  const R = (expanded ? 13 : 19) * PX
  const innerInset = 0.004

  const shape = useMemo(() => roundedRectShape(W, H, R), [W, H, R])
  const innerShape = useMemo(
    () =>
      roundedRectShape(
        W - innerInset * 2,
        H - innerInset * 2,
        Math.max(0.001, R - innerInset),
      ),
    [W, H, R],
  )

  const onTap = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setExpanded((prev) => !prev)
      pulse('right', 0.3, 25)
      playTone(540, 40)
    },
    [pulse, playTone],
  )

  return (
    <group>
      {/* Border ring — theme accent (CP amber / WN ember). */}
      <mesh position={[0, 0, -0.009]} renderOrder={-501}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial
          color={xr.hud.panelBorder}
          transparent
          opacity={0.86 * opacityMult}
          depthWrite={false}
        />
      </mesh>
      {/* Fill — clickable surface, theme panel color. Pointer enter / leave drive the hover
          state for the whole HUD. */}
      <mesh
        position={[0, 0, -0.008]}
        renderOrder={-500}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={onTap}
      >
        <shapeGeometry args={[innerShape]} />
        <meshBasicMaterial
          color={xr.hud.panelFill}
          transparent
          opacity={xr.hud.panelOpacity * opacityMult}
          depthWrite={false}
        />
      </mesh>
      {/* State-conditional content. */}
      {expanded ? (
        <ExpandedContent
          fpsLabel={fpsLabel}
          fpsColor={fpsColor}
          opacityMult={opacityMult}
        />
      ) : (
        <MinimizedContent
          fpsLabel={fpsLabel}
          fpsColor={fpsColor}
          opacityMult={opacityMult}
        />
      )}
    </group>
  )
}

function MinimizedContent({
  fpsLabel,
  fpsColor,
  opacityMult,
}: {
  fpsLabel: string
  fpsColor: string
  opacityMult: number
}) {
  const { xr } = usePlaygroundTheme()
  // Simplified pill: status dot + FPS only. Tap anywhere to expand.
  return (
    <group>
      <mesh position={[-0.040, 0, 0.001]} renderOrder={-498}>
        <circleGeometry args={[0.005, 16]} />
        <meshBasicMaterial
          color={fpsColor}
          transparent
          opacity={0.95 * opacityMult}
          depthWrite={false}
        />
      </mesh>
      <Text
        position={[-0.020, 0, 0.001]}
        fontSize={0.020}
        color={xr.hud.textMetric}
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.003}
        outlineColor={xr.hud.panelFill}
        fillOpacity={opacityMult}
        outlineOpacity={opacityMult}
      >
        {fpsLabel}
      </Text>
    </group>
  )
}

function ExpandedContent({
  fpsLabel,
  fpsColor,
  opacityMult,
}: {
  fpsLabel: string
  fpsColor: string
  opacityMult: number
}) {
  const { xr } = usePlaygroundTheme()
  const W = 295 * PX
  const H = 168 * PX

  // Trial / metric / method values are placeholders for Phase 7 — wiring to runtime app state
  // (Leva selectors, lab trial state) is a Phase 8 follow-up.
  const metrics: [string, string][] = [
    ['TARGET', '0.28'],
    ['BOOST', '0.15'],
    ['HAPTICS', 'ON'],
    ['AUDIO', 'OFF'],
  ]

  return (
    <group>
      {/* Status dot. */}
      <mesh position={[-W / 2 + 0.018, H / 2 - 0.030, 0.001]} renderOrder={-498}>
        <circleGeometry args={[0.006, 16]} />
        <meshBasicMaterial
          color={fpsColor}
          transparent
          opacity={0.95 * opacityMult}
          depthWrite={false}
        />
      </mesh>
      {/* FPS large numeral. */}
      <Text
        position={[-W / 2 + 0.040, H / 2 - 0.030, 0.001]}
        fontSize={0.040}
        color={xr.hud.textMetric}
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.004}
        outlineColor={xr.hud.panelFill}
        fillOpacity={opacityMult}
        outlineOpacity={opacityMult}
      >
        {fpsLabel}
      </Text>
      <Text
        position={[-W / 2 + 0.108, H / 2 - 0.026, 0.001]}
        fontSize={0.012}
        color={xr.hud.textMuted}
        anchorX="left"
        anchorY="middle"
        fillOpacity={opacityMult}
      >
        FPS
      </Text>
      {/* Trial info top-right. */}
      <Text
        position={[W / 2 - 0.020, H / 2 - 0.024, 0.001]}
        fontSize={0.013}
        color={xr.hud.textPrimary}
        anchorX="right"
        anchorY="middle"
        fillOpacity={opacityMult}
      >
        Trial — / —
      </Text>
      <Text
        position={[W / 2 - 0.020, H / 2 - 0.040, 0.001]}
        fontSize={0.010}
        color={xr.hud.textMuted}
        anchorX="right"
        anchorY="middle"
        fillOpacity={opacityMult}
      >
        translation
      </Text>
      {/* Collapse chevron. */}
      <Text
        position={[W / 2 - 0.020, H / 2 - 0.060, 0.001]}
        fontSize={0.014}
        color={xr.hud.panelBorder}
        anchorX="right"
        anchorY="middle"
        fillOpacity={opacityMult}
      >
        ⌄
      </Text>
      {/* Divider line. */}
      <mesh position={[0, H / 2 - 0.075, 0.001]} renderOrder={-498}>
        <planeGeometry args={[W - 0.024, 0.0009]} />
        <meshBasicMaterial
          color={xr.hud.panelBorder}
          transparent
          opacity={0.36 * opacityMult}
          depthWrite={false}
        />
      </mesh>
      {/* 4-cell metric strip. */}
      {metrics.map(([k, v], i) => {
        const cellW = (W - 0.024) / metrics.length
        const cellX = -W / 2 + 0.012 + cellW * (i + 0.5)
        return (
          <group key={k}>
            <Text
              position={[cellX, H / 2 - 0.094, 0.001]}
              fontSize={0.0095}
              color={xr.hud.textMuted}
              anchorX="center"
              anchorY="middle"
              fillOpacity={opacityMult}
            >
              {k}
            </Text>
            <Text
              position={[cellX, H / 2 - 0.114, 0.001]}
              fontSize={0.017}
              color={xr.hud.textPrimary}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.002}
              outlineColor={xr.hud.panelFill}
              fillOpacity={opacityMult}
              outlineOpacity={opacityMult}
            >
              {v}
            </Text>
          </group>
        )
      })}
      {/* Method label footer — accent-tinted background slab. */}
      <mesh position={[0, -H / 2 + 0.020, 0.001]} renderOrder={-498}>
        <planeGeometry args={[W - 0.024, 0.026]} />
        <meshBasicMaterial
          color={xr.hud.panelBorder}
          transparent
          opacity={0.20 * opacityMult}
          depthWrite={false}
        />
      </mesh>
      <Text
        position={[0, -H / 2 + 0.020, 0.002]}
        fontSize={0.013}
        color={xr.hud.panelBorder}
        anchorX="center"
        anchorY="middle"
        fillOpacity={opacityMult}
      >
        Direct touch (hands)
      </Text>
    </group>
  )
}
