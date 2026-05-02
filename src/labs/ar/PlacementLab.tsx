import { Text } from '@react-three/drei'
import {
  IfInSessionMode,
  XRHitTest,
  useXR,
  useXRInputSourceState,
} from '@react-three/xr'
import { useControls } from 'leva'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdditiveBlending, Matrix4, Quaternion, Vector3, type Group } from 'three'
import { useHudReport } from '../../app/useHudReport'
import { stepperNumber } from '../../ui/levaPlugins/stepperNumber'
import { getLabTitle, tuningPresets } from '../../config/labs'
import { LabHeading } from '../LabHeading'
import { readLevaNumber } from '../../ui/levaPlugins/readLevaNumber'
import { usePlaygroundTheme } from '../../xr/theme/PlaygroundThemeContext'
import { resetXRInputDefaults } from '../../xr/core/xrStore'
import { useXRMode } from '../../xr/core/hooks'
import { useHapticPulse } from '../../xr/feedback/haptics/useHapticPulse'
import { useConfirmTone } from '../../xr/feedback/audio/useConfirmTone'
import { PlacementHolo } from '../../xr/visual/holos'
import { SharedArch, StagePlatform } from '../../xr/visual/SharedScenery'

type PlacementTransform = {
  position: Vector3
  quaternion: Quaternion
}

type PlacementSource = 'controller' | 'hand'
type PlacementPhase = 'searching' | 'previewing' | 'placing' | 'placed'

type ActivePlacementSource = {
  kind: PlacementSource
  handedness: XRHandedness
  inputSource: XRInputSource
  hitTestSpace?: XRSpace
}

type Placed = PlacementTransform & {
  id: string
  objectSize: number
  source: PlacementSource
}

function clampObjectSize(value: number) {
  return Math.min(0.24, Math.max(0.06, value))
}

/**
 * Diamond-prism crystal per design-handoff v0.2 Section 02.
 * Height = `objectSize`, width = objectSize * 0.5 (aspect 2:1 per spec).
 * Solid variant: gradient-mapped standard material (warm gold CP / amber WN).
 * Ghost variant: translucent fill + wireframe outline + soft halo, cool-tinted per spec.
 */
function CrystalPrism({
  objectSize,
  variant,
  solidColor,
  seamColor,
  ghostTint,
  ghostAlpha = 0.4,
  emissiveIntensity = 0.35,
}: {
  objectSize: number
  variant: 'solid' | 'ghost'
  solidColor: string
  seamColor: string
  ghostTint: string
  ghostAlpha?: number
  emissiveIntensity?: number
}) {
  // Octahedron(0.5) has unit diameter; scale to width = objectSize*0.5, height = objectSize.
  const halfWidth = objectSize * 0.5
  const fullHeight = objectSize
  const scale: [number, number, number] = [halfWidth, fullHeight, halfWidth]
  const centerY = fullHeight * 0.5

  if (variant === 'ghost') {
    const haloAlpha = Math.min(1, ghostAlpha * 0.55)
    const fillAlpha = Math.min(1, ghostAlpha * 0.8)
    const edgeAlpha = Math.min(1, ghostAlpha * 2.4)
    return (
      <group>
        {/* Soft halo glow under the ghost. */}
        <mesh position={[0, objectSize * 0.4, 0]}>
          <sphereGeometry args={[objectSize * 0.95, 20, 14]} />
          <meshBasicMaterial
            color={ghostTint}
            transparent
            opacity={haloAlpha}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
        {/* Translucent fill. */}
        <mesh position={[0, centerY, 0]} scale={scale}>
          <octahedronGeometry args={[0.5, 0]} />
          <meshBasicMaterial
            color={ghostTint}
            transparent
            opacity={fillAlpha}
            depthWrite={false}
          />
        </mesh>
        {/* Edge wireframe outline — approximates the dashed-outline feel from the spec mock. */}
        <mesh position={[0, centerY, 0]} scale={scale}>
          <octahedronGeometry args={[0.5, 0]} />
          <meshBasicMaterial
            color={ghostTint}
            wireframe
            transparent
            opacity={edgeAlpha}
            depthWrite={false}
          />
        </mesh>
      </group>
    )
  }

  return (
    <group>
      {/* Solid crystal body. */}
      <mesh position={[0, centerY, 0]} scale={scale}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={solidColor}
          emissive={solidColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.25}
          metalness={0.05}
        />
      </mesh>
      {/* Highlight seam down the vertical axis — approximates the seam line in the spec mock. */}
      <mesh position={[0, centerY, 0]} scale={[0.004, fullHeight * 1.02, 0.004]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshBasicMaterial color={seamColor} transparent opacity={0.55} depthWrite={false} />
      </mesh>
    </group>
  )
}

/**
 * Controller-ray reticle per spec Section 02:
 *  - flat ellipse ring on the surface + thin crosshair lines
 *  - warm tint from `xr.affordance.controllerRay`
 * Positioned at the hit-test anchor (y=0 is surface).
 */
function SurfaceReticle({
  objectSize,
  tint,
}: {
  objectSize: number
  tint: string
}) {
  const majorRadius = objectSize * 0.7
  const minorRadius = majorRadius * 0.5
  const crosshairLen = objectSize * 1.0
  const lineThickness = 0.004

  return (
    <group position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Outer ring (stretched to ellipse via scale). */}
      <mesh scale={[1, minorRadius / majorRadius, 1]}>
        <ringGeometry args={[majorRadius * 0.93, majorRadius, 48]} />
        <meshBasicMaterial color={tint} transparent opacity={0.9} depthWrite={false} />
      </mesh>
      {/* Crosshair horizontal. */}
      <mesh>
        <planeGeometry args={[crosshairLen, lineThickness]} />
        <meshBasicMaterial color={tint} transparent opacity={0.75} depthWrite={false} />
      </mesh>
      {/* Crosshair vertical. */}
      <mesh>
        <planeGeometry args={[lineThickness, crosshairLen * 0.55]} />
        <meshBasicMaterial color={tint} transparent opacity={0.75} depthWrite={false} />
      </mesh>
    </group>
  )
}

/**
 * Pinch-halo ring shown above the ghost crystal at fingertip height per spec Section 02.
 * Cool-tinted, horizontal ellipse + short vertical drop-line.
 * (True dashed rendering would need shader/line2 — approximated with solid ring at spec alpha.)
 */
function PinchHalo({
  objectSize,
  tint,
}: {
  objectSize: number
  tint: string
}) {
  const haloY = objectSize * 1.5
  const majorRadius = objectSize * 0.5

  return (
    <group>
      {/* Flat ellipse ring at fingertip height. */}
      <group position={[0, haloY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh scale={[1, 0.35, 1]}>
          <ringGeometry args={[majorRadius * 0.92, majorRadius, 40]} />
          <meshBasicMaterial color={tint} transparent opacity={0.85} depthWrite={false} />
        </mesh>
      </group>
      {/* Vertical drop line from halo down to ghost top. */}
      <mesh position={[0, haloY - objectSize * 0.25, 0]}>
        <cylinderGeometry args={[0.003, 0.003, objectSize * 0.5, 6]} />
        <meshBasicMaterial color={tint} transparent opacity={0.5} depthWrite={false} />
      </mesh>
    </group>
  )
}

function PlacedArtifact({
  objectSize,
  solidColor,
  seamColor,
}: {
  objectSize: number
  solidColor: string
  seamColor: string
}) {
  return (
    <CrystalPrism
      objectSize={objectSize}
      variant="solid"
      solidColor={solidColor}
      seamColor={seamColor}
      ghostTint="#000"
    />
  )
}

export function PlacementLab() {
  const preset = usePlaygroundTheme()
  const { labAccents, xr } = preset
  const mode = useXRMode()
  const defaults = tuningPresets.controller.placement
  const { objectSize, previewOpacity, enableHaptics, enableAudio } = useControls(
    'Placement',
    {
      objectSize: stepperNumber({
        value: defaults.objectSize,
        min: 0.05,
        max: 0.3,
        step: 0.01,
      }),
      previewOpacity: stepperNumber({
        value: defaults.previewOpacity,
        min: 0,
        max: 1,
        step: 0.05,
      }),
      enableHaptics: defaults.enableHaptics,
      enableAudio: defaults.enableAudio,
    },
  )

  const rightController = useXRInputSourceState('controller', 'right')
  const leftController = useXRInputSourceState('controller', 'left')
  const rightHand = useXRInputSourceState('hand', 'right')
  const leftHand = useXRInputSourceState('hand', 'left')

  const [placed, setPlaced] = useState<Placed[]>([])
  const [phase, setPhase] = useState<PlacementPhase>('searching')

  const objSize = clampObjectSize(readLevaNumber(objectSize, defaults.objectSize))
  const previewOp = Math.min(0.85, Math.max(0.15, readLevaNumber(previewOpacity, defaults.previewOpacity)))

  useEffect(() => {
    resetXRInputDefaults()
  }, [])

  useHudReport(
    {
      metrics: [
        { label: 'OBJ SIZE', value: objSize.toFixed(2) },
        { label: 'PREVIEW', value: previewOp.toFixed(2) },
        { label: 'HAPTICS', value: enableHaptics ? 'ON' : 'OFF' },
        { label: 'AUDIO', value: enableAudio ? 'ON' : 'OFF' },
      ],
      methodLabel: 'Placement · AR',
      trial: null,
    },
    [objSize, previewOp, enableHaptics, enableAudio],
  )

  const activeSource = useMemo<ActivePlacementSource | null>(() => {
    const controller = rightController ?? leftController
    if (controller) {
      return {
        kind: 'controller',
        handedness: controller.inputSource.handedness,
        inputSource: controller.inputSource,
        hitTestSpace: controller.inputSource.targetRaySpace ?? undefined,
      }
    }

    const hand = rightHand ?? leftHand
    if (!hand) return null

    return {
      kind: 'hand',
      handedness: hand.inputSource.handedness,
      inputSource: hand.inputSource,
      hitTestSpace:
        hand.inputSource.targetRaySpace ??
        hand.inputSource.hand?.get('index-finger-tip') ??
        undefined,
    }
  }, [leftController, leftHand, rightController, rightHand])

  const updatePhase = useCallback((nextPhase: PlacementPhase) => {
    setPhase((prev) => (prev === nextPhase ? prev : nextPhase))
  }, [])

  const placeObject = useCallback(
    (source: PlacementSource, transform: PlacementTransform, placedSize: number) => {
      setPlaced((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          position: transform.position.clone(),
          quaternion: transform.quaternion.clone(),
          objectSize: placedSize,
          source,
        },
      ])
    },
    [],
  )

  // Solid crystal color per theme (warm gold CP / amber WN) via labAccents.
  const solidColor = labAccents.placement.primary
  const seamColor = xr.orb.idle.core // warm cream highlight

  const sourceLabel = activeSource
    ? `${activeSource.handedness} ${activeSource.kind}`
    : 'waiting for input'
  const prompt =
    phase === 'previewing' || phase === 'placed'
      ? activeSource?.kind === 'controller'
        ? 'Trigger to place on the highlighted surface'
        : 'Pinch to place on the highlighted surface'
      : activeSource
        ? 'Scan a stable surface to reveal the placement guide'
        : 'Enter AR and raise a controller or hand to begin placement'
  const showDesktopShowcase = mode !== 'immersive-ar'

  return (
    <group>
      <LabHeading
        title={getLabTitle('placement')}
        subtitle={`Source ${sourceLabel} · Object ${objSize.toFixed(2)} · Preview ${previewOp.toFixed(2)} · ${phase}`}
      />
      <IfInSessionMode deny="immersive-ar">
        <SharedArch position={[0, 0, -2.5]} holo={<PlacementHolo />} />
        <StagePlatform position={[0, 0, -2.5]} />
      </IfInSessionMode>

      <IfInSessionMode allow="immersive-ar">
        <group>
          <PlacementPreview
            activeSource={activeSource}
            solidColor={solidColor}
            seamColor={seamColor}
            reticleTint={xr.affordance.controllerRay}
            pinchHaloTint={xr.affordance.dockActive}
            ghostTint={xr.affordance.dockActive}
            opacity={previewOp}
            objectSize={objSize}
            enableHaptics={enableHaptics}
            enableAudio={enableAudio}
            onPhaseChange={updatePhase}
            onPlace={placeObject}
          />

          {placed.map((artifact) => (
            <group
              key={artifact.id}
              position={artifact.position}
              quaternion={artifact.quaternion}
            >
              <PlacedArtifact
                objectSize={artifact.objectSize}
                solidColor={solidColor}
                seamColor={seamColor}
              />
            </group>
          ))}

          <Text
            position={[0, 0.95, -0.95]}
            fontSize={0.04}
            color={phase === 'previewing' ? xr.hud.textMetric : xr.hud.textMuted}
            anchorX="center"
            anchorY="middle"
          >
            {prompt}
          </Text>
        </group>
      </IfInSessionMode>

      {showDesktopShowcase && (
        <PlacementShowcase
          objectSize={objSize}
          solidColor={solidColor}
          seamColor={seamColor}
          ghostTint={xr.affordance.dockActive}
          textColor={xr.hud.textMuted}
        />
      )}

      {!placed.length && !showDesktopShowcase && (
        <Text
          position={[0, 1.15, -2]}
          fontSize={0.12}
          color={xr.hud.textMuted}
          anchorX="center"
          anchorY="middle"
        >
          Enter AR, scan a surface, then use trigger or pinch to place
        </Text>
      )}
    </group>
  )
}

/** Desktop / non-AR preview: solid + ghost crystals side by side + label. */
function PlacementShowcase({
  objectSize,
  solidColor,
  seamColor,
  ghostTint,
  textColor,
}: {
  objectSize: number
  solidColor: string
  seamColor: string
  ghostTint: string
  textColor: string
}) {
  const displaySize = Math.max(0.16, objectSize * 1.5)

  return (
    <group position={[0, 0, -1.2]}>
      <group position={[-0.25, 0, 0]}>
        <CrystalPrism
          objectSize={displaySize}
          variant="solid"
          solidColor={solidColor}
          seamColor={seamColor}
          ghostTint={ghostTint}
        />
        <Text
          position={[0, -0.05, 0]}
          fontSize={0.04}
          color={textColor}
          anchorX="center"
          anchorY="top"
        >
          placed
        </Text>
      </group>
      <group position={[0.25, 0, 0]}>
        <CrystalPrism
          objectSize={displaySize}
          variant="ghost"
          solidColor={solidColor}
          seamColor={seamColor}
          ghostTint={ghostTint}
        />
        <Text
          position={[0, -0.05, 0]}
          fontSize={0.04}
          color={textColor}
          anchorX="center"
          anchorY="top"
        >
          ghost preview
        </Text>
      </group>
      <Text
        position={[0, displaySize * 1.6, 0]}
        fontSize={0.055}
        color={textColor}
        anchorX="center"
        anchorY="middle"
      >
        Enter AR to place crystals on detected surfaces
      </Text>
    </group>
  )
}

function PlacementPreview({
  activeSource,
  solidColor,
  seamColor,
  reticleTint,
  pinchHaloTint,
  ghostTint,
  opacity,
  objectSize,
  enableHaptics,
  enableAudio,
  onPhaseChange,
  onPlace,
}: {
  activeSource: ActivePlacementSource | null
  solidColor: string
  seamColor: string
  reticleTint: string
  pinchHaloTint: string
  ghostTint: string
  opacity: number
  objectSize: number
  enableHaptics: boolean
  enableAudio: boolean
  onPhaseChange: (phase: PlacementPhase) => void
  onPlace: (source: PlacementSource, transform: PlacementTransform, objectSize: number) => void
}) {
  const previewRef = useRef<Group>(null)
  const visibleRef = useRef(false)
  const lastSurfaceHitAtRef = useRef(0)
  const matrixHelper = useMemo(() => new Matrix4(), [])
  const pos = useMemo(() => new Vector3(), [])
  const quat = useMemo(() => new Quaternion(), [])

  const session = useXR((state) => state.session)
  const pulse = useHapticPulse()
  const playTone = useConfirmTone()

  const sourceKind = activeSource?.kind

  const hidePreview = useCallback(() => {
    const preview = previewRef.current
    if (!preview) return
    preview.visible = false
    visibleRef.current = false
    lastSurfaceHitAtRef.current = 0
    onPhaseChange('searching')
  }, [onPhaseChange])

  const placeCurrentPreview = useCallback(() => {
    const preview = previewRef.current
    if (!preview || !visibleRef.current || !activeSource) return

    onPhaseChange('placing')
    onPlace(
      activeSource.kind,
      {
        position: preview.position.clone(),
        quaternion: preview.quaternion.clone(),
      },
      objectSize,
    )

    if (activeSource.kind === 'controller' && enableHaptics) {
      pulse(activeSource.handedness === 'left' ? 'left' : 'right', 0.4, 45)
    }
    if (enableAudio) {
      playTone(activeSource.kind === 'controller' ? 520 : 620, 60)
    }

    onPhaseChange('placed')
  }, [
    activeSource,
    enableAudio,
    enableHaptics,
    objectSize,
    onPhaseChange,
    onPlace,
    playTone,
    pulse,
  ])

  useEffect(() => {
    if (!activeSource?.hitTestSpace) {
      hidePreview()
    }
  }, [activeSource, hidePreview])

  useEffect(() => {
    if (!session || !activeSource) return
    const onSelectStart = (event: XRInputSourceEvent) => {
      if (event.inputSource !== activeSource.inputSource) return
      placeCurrentPreview()
    }
    session.addEventListener('selectstart', onSelectStart)
    return () => session.removeEventListener('selectstart', onSelectStart)
  }, [activeSource, placeCurrentPreview, session])

  return (
    <group
      ref={previewRef}
      visible={false}
      pointerEventsType={{ allow: 'ray' }}
      onPointerDown={(event) => {
        event.stopPropagation()
        placeCurrentPreview()
      }}
    >
      {/* Ghost crystal at the anchor. */}
      <group>
        <CrystalPrism
          objectSize={objectSize}
          variant="ghost"
          solidColor={solidColor}
          seamColor={seamColor}
          ghostTint={ghostTint}
          ghostAlpha={opacity}
        />
      </group>

      {/* Source-specific aim affordance. */}
      {sourceKind === 'controller' && (
        <SurfaceReticle objectSize={objectSize} tint={reticleTint} />
      )}
      {sourceKind === 'hand' && (
        <PinchHalo objectSize={objectSize} tint={pinchHaloTint} />
      )}

      {activeSource?.hitTestSpace && (
        <XRHitTest
          key={`${activeSource.kind}-${activeSource.handedness}`}
          space={activeSource.hitTestSpace}
          trackableType={['plane', 'mesh']}
          onResults={(results, getWorldMatrix) => {
            const preview = previewRef.current
            if (!preview) return

            if (results.length === 0) {
              if (
                visibleRef.current &&
                performance.now() - lastSurfaceHitAtRef.current > 180
              ) {
                hidePreview()
              }
              return
            }

            getWorldMatrix(matrixHelper, results[0])
            pos.setFromMatrixPosition(matrixHelper)
            quat.setFromRotationMatrix(matrixHelper)

            preview.visible = true
            preview.position.copy(pos)
            preview.quaternion.copy(quat)
            visibleRef.current = true
            lastSurfaceHitAtRef.current = performance.now()
            onPhaseChange('previewing')
          }}
        />
      )}
    </group>
  )
}
