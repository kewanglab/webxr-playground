import { useGLTF } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
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

type KitInstanceProps = {
  name: string
  options?: KitModelOptions
  position?: [number, number, number]
  scale?: number | [number, number, number]
  rotation?: [number, number, number]
  visible?: boolean
}

function KitPrimitive({
  name,
  options,
  position,
  scale,
  rotation,
}: Omit<KitInstanceProps, 'visible'>) {
  const scene = useKitModel(name, options)
  return (
    <primitive
      object={scene}
      position={position}
      scale={scale}
      rotation={rotation}
    />
  )
}

/**
 * Renders one kit `.glb`, loading it on demand.
 *
 * The local `<Suspense>` is load-bearing: `useGLTF` suspends, and without a
 * boundary here the suspension would propagate to the scene-level boundary in
 * `XRRoot` and blank the entire lab while a single prop downloads. Scoping it
 * means only the prop pops in.
 */
export function KitInstance({ visible = true, ...props }: KitInstanceProps) {
  if (!visible) return null
  return (
    <Suspense fallback={null}>
      <KitPrimitive {...props} />
    </Suspense>
  )
}

/**
 * Warm the loader cache for specific models a lab is about to need.
 *
 * Deliberately takes explicit names: the previous version preloaded the whole
 * kit on app mount, which downloaded every model for every lab and theme even
 * though only the ones a mounted `KitInstance` references are ever drawn.
 */
export function preloadXrKitModels(names: readonly string[]): void {
  for (const n of names) {
    useGLTF.preload(`${XR_KIT_BASE_PATH}${n}.glb`)
  }
}
