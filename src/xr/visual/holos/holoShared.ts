import { usePlaygroundTheme } from '../../theme/PlaygroundThemeContext'

/**
 * Shared design constants for all lab holos. Pulled from the design handoff:
 * primary opacity, secondary opacity, focal-dot radius, ring opacity.
 */
export const HOLO_PRIMARY_OPACITY = 0.92
export const HOLO_SECONDARY_OPACITY = 0.52
export const HOLO_DOT_R = 0.025
export const HOLO_DOT_OPACITY = 0.95
export const HOLO_RING_OPACITY = 0.78

/**
 * Resolve the holo color pair from the active theme. Holos draw their primary stroke from
 * `arch.rim` and their secondary detail from `arch.rimSoft` so each glyph reads as the
 * theme it lives in (WN = ember, CP = amber) while the per-lab shape carries identity.
 */
export function useHoloColors() {
  const preset = usePlaygroundTheme()
  return {
    primary: preset.xr.arch.rim,
    secondary: preset.xr.arch.rimSoft,
    isCP: preset.id === 'cloud-park',
  }
}

/** Closed ring as a polyline. */
export function fullRing(
  r: number,
  segs: number,
  origin: [number, number, number] = [0, 0, 0],
): [number, number, number][] {
  const [ox, oy, oz] = origin
  const pts: [number, number, number][] = []
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2
    pts.push([ox + Math.cos(a) * r, oy + Math.sin(a) * r, oz])
  }
  return pts
}

/** Polyline arc segment from `start` to `end` radians at radius `r`. */
export function arcSegment(
  r: number,
  start: number,
  end: number,
  segs: number,
): [number, number, number][] {
  const pts: [number, number, number][] = []
  for (let i = 0; i <= segs; i++) {
    const a = start + ((end - start) * i) / segs
    pts.push([Math.cos(a) * r, Math.sin(a) * r, 0])
  }
  return pts
}

/**
 * Three-point chevron tangent-aligned to a path. Tip at `pos`, wings open backward
 * (against `tangent`) at ±30°.
 */
export function tangentArrowhead(
  pos: [number, number, number],
  tangent: [number, number],
  size = 0.06,
): [number, number, number][] {
  const len = Math.hypot(tangent[0], tangent[1]) || 1
  const tx = tangent[0] / len
  const ty = tangent[1] / len
  const bx = -tx
  const by = -ty
  const theta = Math.PI / 6
  const w1x = bx * Math.cos(theta) - by * Math.sin(theta)
  const w1y = bx * Math.sin(theta) + by * Math.cos(theta)
  const w2x = bx * Math.cos(-theta) - by * Math.sin(-theta)
  const w2y = bx * Math.sin(-theta) + by * Math.cos(-theta)
  return [
    [pos[0] + size * w1x, pos[1] + size * w1y, pos[2]],
    pos,
    [pos[0] + size * w2x, pos[1] + size * w2y, pos[2]],
  ]
}

/** Closed diamond outline. */
export function diamondOutline(
  halfW: number,
  halfH: number,
  origin: [number, number, number] = [0, 0, 0],
): [number, number, number][] {
  const [ox, oy, oz] = origin
  return [
    [ox, oy + halfH, oz],
    [ox + halfW, oy, oz],
    [ox, oy - halfH, oz],
    [ox - halfW, oy, oz],
    [ox, oy + halfH, oz],
  ]
}

/**
 * Circular arc between two endpoints with controlled sagitta (perpendicular bulge depth).
 * `bulgeSide` selects which side of the chord the bulge sits on.
 */
export function circularArc(
  p1: [number, number, number],
  p2: [number, number, number],
  sagitta: number,
  bulgeSide: 'left' | 'right',
  segs: number,
): [number, number, number][] {
  const dx = p2[0] - p1[0]
  const dy = p2[1] - p1[1]
  const chord = Math.hypot(dx, dy)
  if (chord < 1e-6) return [p1, p2]
  const ux = dx / chord
  const uy = dy / chord
  const sign = bulgeSide === 'left' ? 1 : -1
  const px = -uy * sign
  const py = ux * sign
  const mx = (p1[0] + p2[0]) / 2
  const my = (p1[1] + p2[1]) / 2
  const r = (chord * chord) / (8 * sagitta) + sagitta / 2
  const cx = mx - px * (r - sagitta)
  const cy = my - py * (r - sagitta)
  const a1 = Math.atan2(p1[1] - cy, p1[0] - cx)
  const a2 = Math.atan2(p2[1] - cy, p2[0] - cx)
  let delta = a2 - a1
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  const pts: [number, number, number][] = []
  for (let i = 0; i <= segs; i++) {
    const t = i / segs
    pts.push([cx + r * Math.cos(a1 + delta * t), cy + r * Math.sin(a1 + delta * t), 0])
  }
  return pts
}
