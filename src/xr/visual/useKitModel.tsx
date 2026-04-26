import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import {
  Color,
  type Group,
  type Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from 'three'
import type { GLTF } from 'three-stdlib'

export const XR_KIT_BASE_PATH = '/assets/models/xr-kit/'

export type KitModelOptions = {
  color?: string
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
}

function isStandardLike(
  m: Material,
): m is MeshStandardMaterial | MeshPhysicalMaterial {
  return m instanceof MeshStandardMaterial || m instanceof MeshPhysicalMaterial
}

function cloneAndTint(material: Material, options: KitModelOptions): Material {
  const m = material.clone()
  if (!isStandardLike(m)) return m
  if (options.color !== undefined) m.color = new Color(options.color)
  if (options.emissive !== undefined) m.emissive = new Color(options.emissive)
  if (options.emissiveIntensity !== undefined)
    m.emissiveIntensity = options.emissiveIntensity
  if (options.roughness !== undefined) m.roughness = options.roughness
  if (options.metalness !== undefined) m.metalness = options.metalness
  return m
}

/**
 * Loads a self-contained kit `.glb` from `public/assets/models/xr-kit/`.
 * Clones the scene and materials so multiple instances stay independent.
 */
export function useKitModel(name: string, options?: KitModelOptions): Group {
  const gltf = useGLTF(`${XR_KIT_BASE_PATH}${name}.glb`) as GLTF
  return useMemo(() => {
    const cloned = gltf.scene.clone(true)
    if (!options) return cloned
    cloned.traverse((child) => {
      if (!(child instanceof Mesh) || !child.material) return
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material]
      const next = mats.map((mat) => cloneAndTint(mat, options))
      child.material = next.length === 1 ? next[0]! : next
    })
    return cloned
  }, [
    gltf,
    options?.color,
    options?.emissive,
    options?.emissiveIntensity,
    options?.metalness,
    options?.roughness,
  ])
}

export function KitInstance({
  name,
  options,
  position,
  scale,
  rotation,
  visible = true,
}: {
  name: string
  options?: KitModelOptions
  position?: [number, number, number]
  scale?: number | [number, number, number]
  rotation?: [number, number, number]
  visible?: boolean
}) {
  const scene = useKitModel(name, options)
  if (!visible) return null
  return (
    <primitive
      object={scene}
      position={position}
      scale={scale}
      rotation={rotation}
    />
  )
}

const PRELOAD_NAMES = [
  'platform_round',
  'platform_simple',
  'column_astra',
  'column_hollow',
  'prop_computer',
  'prop_rail',
  'wall_top_straight',
  'wall_bottom_straight',
  'briefing_screen',
] as const

/** Call once (e.g. from `XRRoot` mount) to warm the loader cache. */
export function preloadXrKitModels(): void {
  for (const n of PRELOAD_NAMES) {
    useGLTF.preload(`${XR_KIT_BASE_PATH}${n}.glb`)
  }
}
