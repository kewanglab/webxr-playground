/**
 * Native world-space sizes (meters) from `gltf-transform inspect` on xr-kit/*.glb.
 * Use these to convert “I want X meters on screen” → uniform scale = want / native.
 */
export const XR_KIT_NATIVE = {
  /** Platform_Round1: xz extent ~±3 m */
  platformRoundDiameter: 5.99,
  platformRoundHeight: 0.17,
  /** Local Y of top surface (bbox max) */
  platformRoundTopY: 0.14163,
  /** Platform_Simple: flat slab -2..2 on xz */
  platformSimpleWidth: 4,
  /** Column_Hollow: y 0..5, xz ~±0.6 m */
  columnHollowHeight: 5,
  /** Column_Astra: y ~0..3 m */
  columnAstraHeight: 3.03,
  /** Prop_Rail_4: main run along local Z, length ~3.93 m, height ~0.86 m */
  propRailLengthZ: 3.93,
  /** Prop_Computer: y ~0..1.59 m */
  propComputerHeight: 1.59,
} as const

/** Pedestal footprint slightly wider than a cube of side `targetCubeSize`. */
export function scalePlatformRoundForTargetCube(targetCubeSize: number): number {
  const s = Math.max(0.12, targetCubeSize)
  const footprint = Math.min(1.25, Math.max(0.52, s * 2.35))
  return footprint / XR_KIT_NATIVE.platformRoundDiameter
}

/** Column hollow scaled to roughly `targetHeightM` meters tall. */
export function scaleColumnHollowToHeight(targetHeightM: number): number {
  return targetHeightM / XR_KIT_NATIVE.columnHollowHeight
}

/** Column Astra scaled to roughly `targetHeightM` meters tall. */
export function scaleColumnAstraToHeight(targetHeightM: number): number {
  return targetHeightM / XR_KIT_NATIVE.columnAstraHeight
}

/** Rail segment length along Z after uniform scale. */
export function scalePropRailToLength(targetLengthM: number): number {
  return targetLengthM / XR_KIT_NATIVE.propRailLengthZ
}

/** Floor / bench slab ~`widthM` meters on X and Z (native 4×4 m). */
export function scalePlatformSimpleToWidth(widthM: number): number {
  return widthM / XR_KIT_NATIVE.platformSimpleWidth
}

/** Console / screen roughly `heightM` meters tall. */
export function scalePropComputerToHeight(heightM: number): number {
  return heightM / XR_KIT_NATIVE.propComputerHeight
}
