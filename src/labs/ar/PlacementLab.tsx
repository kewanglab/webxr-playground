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
import { stepperNumber } from '../../ui/levaPlugins/stepperNumber'
import { getLabTitle, tuningPresets } from '../../config/labs'
import { LabHeading } from '../LabHeading'
import { readLevaNumber } from '../../ui/levaPlugins/readLevaNumber'
import { usePlaygroundTheme } from '../../xr/theme/PlaygroundThemeContext'
import { resetXRInputDefaults } from '../../xr/core/xrStore'
import { useXRMode } from '../../xr/core/hooks'
import { useHapticPulse } from '../../xr/feedback/haptics/useHapticPulse'
import { useConfirmTone } from '../../xr/feedback/audio/useConfirmTone'
import { SensorPodObject } from '../cross-xr/manipulation/SensorPodObject'
import {
  CloudParkBeaconObject,
  CloudParkShadowBlob,
  CloudParkWindLine,
  FloatingCloudMat,
} from '../../xr/visual/CloudParkScenery'

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

function PlacedArtifact({
  objectSize,
  color,
  secondary,
  isCloudPark = false,
}: {
  objectSize: number
  color: string
  secondary: string
  isCloudPark?: boolean
}) {
  if (isCloudPark) {
    return (
      <group>
        <FloatingCloudMat
          position={[0, 0.004, 0]}
          scale={objectSize * 2.5}
          cloudColor="#FFF5DA"
          shadeColor="#DFF4E6"
          rimColor={secondary}
        />
        <CloudParkShadowBlob
          position={[0, objectSize * 0.03, 0]}
          scale={[objectSize * 5.2, 1, objectSize * 3.2]}
          color={color}
          opacity={0.14}
        />
        <mesh
          position={[0, objectSize * 0.08, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[objectSize * 0.5, objectSize * 0.72, 40]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.46}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
        <group position={[0, objectSize * 0.48, 0]} scale={0.94}>
          <CloudParkBeaconObject
            objectSize={objectSize}
            baseColor="#FFF3D4"
            accentColor={color}
            restAccent={secondary}
          />
        </group>
        <CloudParkWindLine
          position={[objectSize * 0.64, objectSize * 0.42, objectSize * 0.16]}
          rotation={[0, 0, -0.18]}
          length={objectSize * 2.1}
          color={secondary}
          opacity={0.32}
        />
      </group>
    )
  }

  return (
    <group>
      <mesh
        position={[0, objectSize * 0.03, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[objectSize * 0.42, objectSize * 0.58, 40]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <group position={[0, objectSize * 0.42, 0]} scale={0.9}>
        <SensorPodObject
          objectSize={objectSize}
          baseColor="#ece7df"
          accentColor={color}
          restAccent={secondary}
        />
      </group>
    </group>
  )
}

export function PlacementLab() {
  const preset = usePlaygroundTheme()
  const { labAccents, xr } = preset
  const mode = useXRMode()
  const isCloudPark = preset.id === 'cloud-park'
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
  const showDesktopShowcase = isCloudPark && mode !== 'immersive-ar'

  return (
    <group>
      <LabHeading
        title={getLabTitle('placement')}
        subtitle={`Source ${sourceLabel} · Object ${objSize.toFixed(2)} · Preview ${previewOp.toFixed(2)} · ${phase}`}
      />

      <IfInSessionMode allow="immersive-ar">
        <group>
          <PlacementPreview
            activeSource={activeSource}
            color={labAccents.placement.primary}
            secondary={labAccents.placement.secondary}
            opacity={previewOp}
            objectSize={objSize}
            isCloudPark={isCloudPark}
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
                color={
                  artifact.source === 'controller'
                    ? labAccents.placement.primary
                    : labAccents.placement.secondary
                }
                secondary={xr.accent.mustard}
                isCloudPark={isCloudPark}
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
        <CloudParkPlacementShowcase
          objectSize={objSize}
          color={labAccents.placement.primary}
          secondary={labAccents.placement.secondary}
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

function CloudParkPlacementShowcase({
  objectSize,
  color,
  secondary,
  textColor,
}: {
  objectSize: number
  color: string
  secondary: string
  textColor: string
}) {
  const displaySize = Math.max(0.68, objectSize * 2.2)

  return (
    <group position={[0, 0, -1.08]}>
      <FloatingCloudMat
        position={[0, 0.02, 0]}
        scale={1.22}
        cloudColor="#FFF5DA"
        shadeColor="#DFF4E6"
        rimColor={secondary}
      />
      <PlacedArtifact
        objectSize={displaySize}
        color={color}
        secondary={secondary}
        isCloudPark
      />
      <CloudParkWindLine
        position={[-0.78, 0.52, 0.02]}
        rotation={[0, 0, 0.16]}
        length={0.88}
        color={secondary}
        opacity={0.32}
      />
      <CloudParkWindLine
        position={[0.78, 0.68, -0.02]}
        rotation={[0, 0, -0.12]}
        length={0.72}
        color={color}
        opacity={0.28}
      />
      <Text
        position={[0, 1.12, -0.04]}
        fontSize={0.07}
        color={textColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.005}
        outlineColor="#E7F7EF"
      >
        Surface marker preview
      </Text>
    </group>
  )
}

function PlacementPreview({
  activeSource,
  color,
  secondary,
  opacity,
  objectSize,
  isCloudPark,
  enableHaptics,
  enableAudio,
  onPhaseChange,
  onPlace,
}: {
  activeSource: ActivePlacementSource | null
  color: string
  secondary: string
  opacity: number
  objectSize: number
  isCloudPark: boolean
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[objectSize * 0.46, objectSize * 0.64, 40]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={Math.min(0.9, opacity)}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[objectSize * 0.26, 32]} />
        <meshBasicMaterial
          color={secondary}
          transparent
          opacity={Math.min(0.36, opacity * 0.45)}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <group position={[0, objectSize * 0.42, 0]} scale={0.9}>
        {isCloudPark ? (
          <CloudParkBeaconObject
            objectSize={objectSize}
            baseColor="#FFF3D4"
            accentColor={color}
            restAccent={secondary}
            transparent
            opacity={Math.min(0.44, opacity * 0.58)}
            depthWrite={false}
          />
        ) : (
          <SensorPodObject
            objectSize={objectSize}
            baseColor="#f4efe7"
            accentColor={color}
            restAccent={secondary}
            transparent
            opacity={Math.min(0.42, opacity * 0.56)}
            depthWrite={false}
          />
        )}
      </group>

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
