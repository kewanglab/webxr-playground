import { Text } from '@react-three/drei'
import { useCallback, useEffect, useMemo } from 'react'
import {
  Color,
  DoubleSide,
  Euler,
  Quaternion,
  RepeatWrapping,
  DataTexture,
  RGBAFormat,
  UnsignedByteType,
} from 'three'
import type { PlaygroundThemePreset } from '../../../config/playgroundTheme'
import type { ManipulationAcquisition, ManipulationTechnique } from '../ObjectManipulationLab'
import { tuningPresets } from '../../../config/labs'
import { useHandJoints } from './useHandJoints'
import { useManipulation } from './useManipulation'
import { ManipulableObject } from './ManipulableObject'
import { CherryPetals } from './CherryPetals'
import { usePlaygroundStore } from '../../../app/store'
import { xrStore } from '../../../xr/core/xrStore'
import { usePlaygroundTheme } from '../../../xr/theme/PlaygroundThemeContext'

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

type GardenObjectDef = Omit<GardenObject, 'color'>

type ZenModePalette = {
  byId: Record<string, string>
  mossLight: string
  mossDark: string
  stem: string
  flowerCenter: string
  woodTray: string
  woodRim: string
  sandTint: string
  pointLight: string
  branchDecor: string
  blossom: string
  arrangeText: string
  tinyPebbles: [string, string, string]
}

function hexFromColor(c: Color): string {
  return '#' + c.getHexString()
}

function toneHex(hex: string, factor: number): string {
  const c = new Color(hex)
  c.multiplyScalar(factor)
  return hexFromColor(c)
}

function lerpHex(a: string, b: string, t: number): string {
  return hexFromColor(new Color().lerpColors(new Color(a), new Color(b), t))
}

function buildZenPalette(p: PlaygroundThemePreset): ZenModePalette {
  const { xr, shell, labAccents } = p
  const m = labAccents.manipulation
  return {
    byId: {
      'stone-1': xr.accent.stone,
      'stone-2': toneHex(xr.accent.stone, 0.78),
      'branch-1': xr.accent.seal,
      'pebble-1': lerpHex(xr.accent.stone, '#ffffff', 0.3),
      'crystal-1': xr.accent.cyan,
      'moss-1': toneHex(xr.accent.stone, 0.88),
      'flower-1': shell.accent.soft,
    },
    mossLight: shell.state.success,
    mossDark: toneHex(shell.state.success, 0.82),
    stem: toneHex(shell.state.success, 0.62),
    flowerCenter: xr.accent.amber,
    woodTray: lerpHex(xr.accent.mustard, xr.accent.seal, 0.5),
    woodRim: toneHex(xr.accent.seal, 0.88),
    sandTint: lerpHex(xr.floor.albedo, xr.accent.stone, 0.35),
    pointLight: shell.accent.soft,
    branchDecor: xr.accent.seal,
    blossom: shell.accent.soft,
    arrangeText: m.primary,
    tinyPebbles: [
      lerpHex(xr.accent.stone, '#ffffff', 0.4),
      xr.hud.textMuted,
      lerpHex(xr.accent.stone, '#ffffff', 0.25),
    ],
  }
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

const GARDEN_OBJECT_DEFS: GardenObjectDef[] = [
  { id: 'stone-1', label: 'Flat stone', position: [-0.12, 0.79, -0.75], geometry: 'stone-flat' },
  { id: 'stone-2', label: 'Tall stone', position: [0.14, 0.83, -0.82], geometry: 'stone-tall' },
  { id: 'branch-1', label: 'Branch', position: [0.22, 0.82, -0.70], rotation: [0, 0, 0.3], geometry: 'branch' },
  { id: 'pebble-1', label: 'Pebble', position: [-0.08, 0.78, -0.68], geometry: 'pebble' },
  { id: 'crystal-1', label: 'Crystal', position: [0.0, 0.80, -0.70], geometry: 'crystal' },
  { id: 'moss-1', label: 'Moss rock', position: [-0.20, 0.80, -0.85], geometry: 'moss-rock' },
  { id: 'flower-1', label: 'Flower', position: [0.08, 0.80, -0.90], rotation: [0.2, 0, 0], geometry: 'flower' },
]

function GardenObjectMesh({
  def,
  size,
  zen,
}: {
  def: GardenObject
  size: number
  zen: ZenModePalette
}) {
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
            <meshStandardMaterial color={zen.mossLight} roughness={1} />
          </mesh>
          <mesh position={[-size * 0.2, size * 0.15, -size * 0.1]}>
            <sphereGeometry args={[size * 0.12, 4, 3]} />
            <meshStandardMaterial color={zen.mossDark} roughness={1} />
          </mesh>
        </group>
      )
    case 'flower':
      return (
        <group>
          {/* Stem */}
          <mesh castShadow>
            <cylinderGeometry args={[size * 0.02, size * 0.025, size * 0.8, 5]} />
            <meshStandardMaterial color={zen.stem} roughness={0.9} />
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
            <meshStandardMaterial color={zen.flowerCenter} roughness={0.7} />
          </mesh>
        </group>
      )
  }
}

/** Procedural rake-pattern texture for the sand surface. */
function useSandTexture() {
  const tex = useMemo(() => {
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
    const texture = new DataTexture(data, w, h, RGBAFormat, UnsignedByteType)
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.needsUpdate = true
    return texture
  }, [])

  useEffect(() => {
    return () => {
      tex.dispose()
    }
  }, [tex])

  return tex
}

export function ZenGardenMode({
  acquisition,
  technique,
  objectSize,
  grabDistance,
  cdGain,
}: ZenGardenModeProps) {
  const preset = usePlaygroundTheme()
  const zen = useMemo(() => buildZenPalette(preset), [preset])
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
      <pointLight position={[0.3, 1.5, -0.5]} intensity={0.4} color={zen.pointLight} distance={3} />

      {/* Platform — wooden tray with darker base */}
      <mesh position={[0, 0.73, -0.78]} receiveShadow castShadow>
        <boxGeometry args={[0.74, 0.035, 0.54]} />
        <meshStandardMaterial color={zen.woodTray} roughness={0.85} />
      </mesh>

      {/* Sand surface with rake pattern */}
      <mesh position={[0, 0.755, -0.78]} receiveShadow>
        <boxGeometry args={[0.68, 0.008, 0.48]} />
        <meshStandardMaterial
          map={sandTexture}
          color={zen.sandTint}
          roughness={1}
        />
      </mesh>

      {/* Wooden rim pieces */}
      {/* Left */}
      <mesh position={[-0.355, 0.76, -0.78]} castShadow>
        <boxGeometry args={[0.02, 0.04, 0.52]} />
        <meshStandardMaterial color={zen.woodRim} roughness={0.9} />
      </mesh>
      {/* Right */}
      <mesh position={[0.355, 0.76, -0.78]} castShadow>
        <boxGeometry args={[0.02, 0.04, 0.52]} />
        <meshStandardMaterial color={zen.woodRim} roughness={0.9} />
      </mesh>
      {/* Front */}
      <mesh position={[0, 0.76, -0.54]} castShadow>
        <boxGeometry args={[0.74, 0.04, 0.02]} />
        <meshStandardMaterial color={zen.woodRim} roughness={0.9} />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.76, -1.02]} castShadow>
        <boxGeometry args={[0.74, 0.04, 0.02]} />
        <meshStandardMaterial color={zen.woodRim} roughness={0.9} />
      </mesh>

      {/* Small corner accent stones (decorative, not manipulable) */}
      <mesh position={[-0.28, 0.76, -0.96]}>
        <sphereGeometry args={[0.015, 5, 4]} />
        <meshStandardMaterial color={zen.tinyPebbles[0]} roughness={0.9} />
      </mesh>
      <mesh position={[0.26, 0.76, -0.58]}>
        <sphereGeometry args={[0.012, 5, 4]} />
        <meshStandardMaterial color={zen.tinyPebbles[1]} roughness={0.9} />
      </mesh>
      <mesh position={[-0.25, 0.76, -0.60]}>
        <sphereGeometry args={[0.01, 4, 3]} />
        <meshStandardMaterial color={zen.tinyPebbles[2]} roughness={0.9} />
      </mesh>

      {/* Cherry petals falling */}
      <CherryPetals />

      {/* Cherry branch hint above the scene (decorative) */}
      <mesh position={[0.25, 1.35, -0.9]} rotation={[0.1, -0.3, 0.4]}>
        <cylinderGeometry args={[0.006, 0.01, 0.4, 5]} />
        <meshStandardMaterial color={zen.branchDecor} roughness={0.95} />
      </mesh>
      {/* Blossoms on the branch */}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`blossom-${i}`}
          position={[0.22 + i * 0.04, 1.37 + Math.sin(i) * 0.02, -0.88 - i * 0.015]}
        >
          <sphereGeometry args={[0.015 + i * 0.003, 5, 4]} />
          <meshStandardMaterial color={zen.blossom} roughness={0.6} />
        </mesh>
      ))}

      {/* Garden objects */}
      {GARDEN_OBJECT_DEFS.map((def) => {
        const color = zen.byId[def.id]
        if (!color) return null
        const full: GardenObject = { ...def, color }
        return (
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
            <GardenObjectMesh def={full} size={objectSize} zen={zen} />
          </ManipulableObject>
        )
      })}

      {/* Active object indicator */}
      {state.isManipulating && (
        <Text
          position={[0, 0.65, -0.78]}
          fontSize={0.035}
          color={zen.arrangeText}
          anchorX="center"
          anchorY="middle"
        >
          {`Arranging: ${state.targetId}`}
        </Text>
      )}

    </group>
  )
}
