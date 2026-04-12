/** Normalize Leva control values that may be number or transient string. */
export function readLevaNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}
