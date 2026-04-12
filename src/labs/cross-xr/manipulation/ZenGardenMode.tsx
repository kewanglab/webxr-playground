import { Text } from '@react-three/drei'
import { useCallback, useMemo } from 'react'
import {
  DoubleSide,
  Euler,
  Quaternion,
  RepeatWrapping,
  Vector3,
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
} from 'three'
import type { ManipulationAcquisition, ManipulationTechnique } from '../ObjectManipulationLab'
import { tuningPresets } from '../../../config/labs'
import { useHandJoints } from './useHandJoints'
import { useManipulation } from './useManipulation'
import { ManipulableObject } from './ManipulableObject'
import { CherryPetals } from './CherryPetals'
import { usePlaygroundStore } from '../../../app/store'
import { xrStore } from '../../../xr/core/xrStore'

type ZenGardenModeProps = {
  acquisition: ManipulationAcquisition
  technique: ManipulationTechnique
  objectSize: number
  grabDistance: number
  cdGain: number
}

const DEFAULTS = tuningPresets.manipulation

type GardenObject = {
  id: string
  label: string
  position: [number, number, number]
  rotation?: [number, number, number]
  geometry: 'stone-flat' | 'stone-tall' | 'branch' | 'pebble' | 'crystal' | 'moss-rock' | 'flower'
  color: string
}

/** Local-space AABB half-extents for pinch proximity (matches composite mesh bounds). */
function zenGardenHitHalfExtents(
  geometry: GardenObject['geometry'],
  size: number,
): [number, number, number] {
  const s = size
  switch (geometry) {
    case 'stone-flat':
      return [(1.4 * s) / 2, (0.35 * s) / 2, (1.1 * s) / 2]
    case 'stone-tall':
      return [(0.55 * s) / 2, (1.4 * s) / 2, (0.65 * s) / 2]
    case 'branch':
      return [0.42 * s, 0.95 * s, 0.2 * s]
    case 'pebble':
      return [0.35 * s, 0.35 * s, 0.35 * s]
    case 'crystal':
      return [0.45 * s, 0.45 * s, 0.45 * s]
    case 'moss-rock':
      return [0.52 * s, 0.58 * s, 0.52 * s]
    case 'flower':
      return [0.26 * s, 0.52 * s, 0.26 * s]
  }
}

const GARDEN_OBJECTS: GardenObject[] = [
  { id: 'stone-1', label: 'Flat stone', position: [-0.12, 0.79, -0.75], geometry: 'stone-flat', color: '#78716c' },
  { id: 'stone-2', label: 'Tall stone', position: [0.14, 0.83, -0.82], geometry: 'stone-tall', color: '#57534e' },
  { id: 'branch-1', label: 'Branch', position: [0.22, 0.82, -0.70], rotation: [0, 0, 0.3], geometry: 'branch', color: '#7c2d12' },
  { id: 'pebble-1', label: 'Pebble', position: [-0.08, 0.78, -0.68], geometry: 'pebble', color: '#a8a29e' },
  { id: 'crystal-1', label: 'Crystal', position: [0.0, 0.80, -0.70], geometry: 'crystal', color: '#c4b5fd' },
  { id: 'moss-1', label: 'Moss rock', position: [-0.20, 0.80, -0.85], geometry: 'moss-rock', color: '#6b7280' },
  { id: 'flower-1', label: 'Flower', position: [0.08, 0.80, -0.90], rotation: [0.2, 0, 0], geometry: 'flower', color: '#fda4af' },
]

function GardenObjectMesh({ def, size }: { def: GardenObject; size: number }) {
  switch (def.geometry) {
    case 'stone-flat':
      return (
        <mesh castShadow>
          <boxGeometry args={[size * 1.4, size * 0.35, size * 1.1]} />
          <meshStandardMaterial color={def.color} roughness={0.92} />
        </mesh>
      )
    case 'stone-tall':
      return (
        <mesh castShadow>
          <boxGeometry args={[size * 0.55, size * 1.4, size * 0.65]} />
          <meshStandardMaterial color={def.color} roughness={0.95} />
        </mesh>
      )
    case 'branch':
      return (
        <group>
          <mesh castShadow>
            <cylinderGeometry args={[size * 0.06, size * 0.09, size * 1.8, 6]} />
            <meshStandardMaterial color={def.color} roughness={0.95} />
          </mesh>
          {/* Small offshoots */}
          <mesh position={[size * 0.15, size * 0.4, 0]} rotation={[0, 0, 0.6]} castShadow>
            <cylinderGeometry args={[size * 0.03, size * 0.05, size * 0.6, 5]} />
            <meshStandardMaterial color={def.color} roughness={0.95} />
          </mesh>
          <mesh position={[-size * 0.1, size * 0.6, 0]} rotation={[0, 0, -0.5]} castShadow>
            <cylinderGeometry args={[size * 0.02, size * 0.04, size * 0.4, 5]} />
            <meshStandardMaterial color={def.color} roughness={0.95} />
          </mesh>
        </group>
      )
    case 'pebble':
      return (
        <mesh castShadow>
          <sphereGeometry args={[size * 0.35, 7, 5]} />
          <meshStandardMaterial color={def.color} roughness={0.85} />
        </mesh>
      )
    case 'crystal':
      return (
        <mesh castShadow>
          <octahedronGeometry args={[size * 0.45, 0]} />
          <meshStandardMaterial color={def.color} roughness={0.15} metalness={0.3} />
        </mesh>
      )
    case 'moss-rock':
      return (
        <group>
          <mesh castShadow>
            <dodecahedronGeometry args={[size * 0.45, 0]} />
            <meshStandardMaterial color={def.color} roughness={0.9} />
          </mesh>
          {/* Moss patches */}
          <mesh position={[0, size * 0.3, size * 0.15]}>
            <sphereGeometry args={[size * 0.2, 5, 4]} />
            <meshStandardMaterial color="#4ade80" roughness={1} />
          </mesh>
          <mesh position={[-size * 0.2, size * 0.15, -size * 0.1]}>
            <sphereGeometry args={[size * 0.12, 4, 3]} />
            <meshStandardMaterial color="#22c55e" roughness={1} />
          </mesh>
        </group>
      )
    case 'flower':
      return (
        <group>
          {/* Stem */}
          <mesh castShadow>
            <cylinderGeometry args={[size * 0.02, size * 0.025, size * 0.8, 5]} />
            <meshStandardMaterial color="#15803d" roughness={0.9} />
          </mesh>
          {/* Petals */}
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i * Math.PI * 2) / 5) * size * 0.12,
                size * 0.4,
                Math.sin((i * Math.PI * 2) / 5) * size * 0.12,
              ]}
              rotation={[0.3, (i * Math.PI * 2) / 5, 0]}
              castShadow
            >
              <sphereGeometry args={[size * 0.1, 5, 4]} />
              <meshStandardMaterial color={def.color} roughness={0.6} side={DoubleSide} />
            </mesh>
          ))}
          {/* Center */}
          <mesh position={[0, size * 0.4, 0]}>
            <sphereGeometry args={[size * 0.06, 5, 4]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.7} />
          </mesh>
        </group>
      )
  }
}

/** Procedural rake-pattern texture for the sand surface. */
function useSandTexture() {
  return useMemo(() => {
    const w = 128
    const h = 128
    const data = new Uint8Array(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4
        // Concentric circle rake pattern centered in the texture
        const cx = x - w / 2
        const cy = y - h / 2
        const dist = Math.sqrt(cx * cx + cy * cy)
        const wave = Math.sin(dist * 0.8) * 0.5 + 0.5
        const base = 210 + wave * 20
        const noise = Math.random() * 8
        const v = Math.min(255, base + noise)
        data[i] = v
        data[i + 1] = v - 5
        data[i + 2] = v - 15
        data[i + 3] = 255
      }
    }
    const tex = new DataTexture(data, w, h, RGBAFormat, UnsignedByteType)
    tex.wrapS = tex.wrapT = RepeatWrapping
    tex.needsUpdate = true
    return tex
  }, [])
}

export function ZenGardenMode({
  acquisition,
  technique,
  objectSize,
  grabDistance,
  cdGain,
}: ZenGardenModeProps) {
  const joints = useHandJoints('right')
  const addLogEntry = usePlaygroundStore((s) => s.addLogEntry)
  const currentLab = usePlaygroundStore((s) => s.currentLab)
  const sandTexture = useSandTexture()

  const onRelease = useCallback(
    (id: string) => {
      addLogEntry({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        labId: currentLab,
        mode: xrStore.getState().mode,
        inputSource: 'hand',
        note: `Zen Garden: released "${id}" with ${technique}`,
      })
    },
    [technique, addLogEntry, currentLab],
  )

  const { register, state, acquireById, releaseActive } = useManipulation({
    acquisition,
    technique,
    joints,
    cdGain,
    grabDistance,
    onRelease,
  })

  return (
    <group>
      {/* Ambient atmosphere */}
      <pointLight position={[0.3, 1.5, -0.5]} intensity={0.4} color="#ffe4e6" distance={3} />

      {/* Platform — wooden tray with darker base */}
      <mesh position={[0, 0.73, -0.78]} receiveShadow castShadow>
        <boxGeometry args={[0.74, 0.035, 0.54]} />
        <meshStandardMaterial color="#8B6914" roughness={0.85} />
      </mesh>

      {/* Sand surface with rake pattern */}
      <mesh position={[0, 0.755, -0.78]} receiveShadow>
        <boxGeometry args={[0.68, 0.008, 0.48]} />
        <meshStandardMaterial map={sandTexture} roughness={1} />
      </mesh>

      {/* Wooden rim pieces */}
      {/* Left */}
      <mesh position={[-0.355, 0.76, -0.78]} castShadow>
        <boxGeometry args={[0.02, 0.04, 0.52]} />
        <meshStandardMaterial color="#6B4F1D" roughness={0.9} />
      </mesh>
      {/* Right */}
      <mesh position={[0.355, 0.76, -0.78]} castShadow>
        <boxGeometry args={[0.02, 0.04, 0.52]} />
        <meshStandardMaterial color="#6B4F1D" roughness={0.9} />
      </mesh>
      {/* Front */}
      <mesh position={[0, 0.76, -0.54]} castShadow>
        <boxGeometry args={[0.74, 0.04, 0.02]} />
        <meshStandardMaterial color="#6B4F1D" roughness={0.9} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.76, -1.02]} castShadow>
        <boxGeometry args={[0.74, 0.04, 0.02]} />
        <meshStandardMaterial color="#6B4F1D" roughness={0.9} />
      </mesh>

      {/* Small corner accent stones (decorative, not manipulable) */}
      <mesh position={[-0.28, 0.76, -0.96]}>
        <sphereGeometry args={[0.015, 5, 4]} />
        <meshStandardMaterial color="#d6d3d1" roughness={0.9} />
      </mesh>
      <mesh position={[0.26, 0.76, -0.58]}>
        <sphereGeometry args={[0.012, 5, 4]} />
        <meshStandardMaterial color="#e7e5e4" roughness={0.9} />
      </mesh>
      <mesh position={[-0.25, 0.76, -0.60]}>
        <sphereGeometry args={[0.01, 4, 3]} />
        <meshStandardMaterial color="#d6d3d1" roughness={0.9} />
      </mesh>

      {/* Cherry petals falling */}
      <CherryPetals />

      {/* Cherry branch hint above the scene (decorative) */}
      <mesh position={[0.25, 1.35, -0.9]} rotation={[0.1, -0.3, 0.4]}>
        <cylinderGeometry args={[0.006, 0.01, 0.4, 5]} />
        <meshStandardMaterial color="#5c2a0a" roughness={0.95} />
      </mesh>
      {/* Blossoms on the branch */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`blossom-${i}`}
          position={[0.22 + i * 0.04, 1.37 + Math.sin(i) * 0.02, -0.88 - i * 0.015]}
        >
          <sphereGeometry args={[0.015 + i * 0.003, 5, 4]} />
          <meshStandardMaterial color="#fecdd3" roughness={0.6} />
        </mesh>
      ))}

      {/* Garden objects */}
      {GARDEN_OBJECTS.map((def) => (
        <ManipulableObject
          key={def.id}
          id={def.id}
          initialPosition={def.position}
          initialQuaternion={
            def.rotation
              ? new Quaternion().setFromEuler(new Euler(...def.rotation))
              : undefined
          }
          hitHalfExtents={zenGardenHitHalfExtents(def.geometry, objectSize)}
          register={register}
          isActive={state.targetId === def.id}
          onPointerDown={acquisition === 'ray' ? () => acquireById(def.id) : undefined}
          onPointerUp={acquisition === 'ray' ? () => releaseActive() : undefined}
        >
          <GardenObjectMesh def={def} size={objectSize} />
        </ManipulableObject>
      ))}

      {/* Active object indicator */}
      {state.isManipulating && (
        <Text
          position={[0, 0.65, -0.78]}
          fontSize={0.035}
          color="#f59e0b"
          anchorX="center"
          anchorY="middle"
        >
          {`Arranging: ${state.targetId}`}
        </Text>
      )}

    </group>
  )
}
