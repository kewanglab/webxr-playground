/**
 * `FRAMEWORK_MCP_RUNTIME` shim — the app half of the agent harness.
 *
 * `@iwsdk/vite-plugin-dev` gives an agent the *device*: it can move the
 * emulated headset and hands, pinch, pull triggers, screenshot, and read the
 * console. What it cannot do on its own is answer "where is the thing I am
 * supposed to grab?", because those tools are written against IWSDK's own
 * ECS runtime. The plugin leaves a documented seam for that — any framework
 * may publish `window.FRAMEWORK_MCP_RUNTIME`, and the injected MCP bridge
 * routes matching methods to it before falling back to the IWER device.
 *
 * This module is that seam for React Three Fiber. It exposes three groups:
 *
 * - **scene** — walk the live `Object3D` graph and resolve world transforms,
 *   so an agent can aim at an object by name instead of guessing coordinates.
 * - **frameloop** — pause/resume/step, mapped onto R3F's `frameloop="never"`
 *   plus `advance()`, for frame-by-frame inspection.
 * - **entities** — a deliberately thin "ECS" facade over what this app
 *   actually has: the zustand playground store, the Leva control values, and
 *   named scene objects.
 *
 * There is no ECS here, and the shim does not pretend otherwise: `handles()`
 * claims only the methods it can honestly serve, so anything else falls
 * through to the plugin's own error path rather than returning a plausible
 * lie. See `docs/agent-harness.md` for the mapping table and its limits.
 *
 * Dev-only. `App.tsx` mounts it behind `import.meta.env.DEV`, which folds to
 * `false` in `vite build` and drops this module from the production graph.
 */
import { useThree } from '@react-three/fiber'
import { levaStore } from 'leva'
import { useEffect } from 'react'
import { Object3D, Quaternion, Vector3 } from 'three'
import { usePlaygroundStore } from '../app/store'
import { isValidLabId } from '../config/labs'
import { isValidPresetId } from '../config/playgroundTheme'
import {
  defaultXRControllerConfig,
  defaultXRHandConfig,
  xrStore,
} from '../xr/core/xrStore'

type Params = Record<string, unknown>
type Vec3Json = { x: number; y: number; z: number }
type QuatJson = { x: number; y: number; z: number; w: number }

/** Pseudo-entities for the stores this app steers itself with. */
const PLAYGROUND_ENTITY = 0
const LEVA_ENTITY = 1
const XR_SESSION_ENTITY = 2
const XR_INPUT_ENTITY = 3

const DEFAULT_STEP_DELTA = 1 / 72 // Quest refresh rate, matching the tool's default

const _worldPos = new Vector3()
const _worldQuat = new Quaternion()
const _worldScale = new Vector3()
const _relative = new Vector3()

function vec3(v: Vector3): Vec3Json {
  return { x: v.x, y: v.y, z: v.z }
}

function quat(q: Quaternion): QuatJson {
  return { x: q.x, y: q.y, z: q.z, w: q.w }
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/**
 * Object3D entity indices are handed out lazily and remembered as UUIDs, not
 * as object references — a detached node then resolves to a clear "no longer
 * in the scene" error instead of silently keeping a dead subtree alive.
 */
const uuidByEntity = new Map<number, string>()
const entityByUuid = new Map<string, number>()
let nextEntity = 4

function entityFor(object: Object3D): number {
  const existing = entityByUuid.get(object.uuid)
  if (existing != null) return existing
  const index = nextEntity++
  uuidByEntity.set(index, object.uuid)
  entityByUuid.set(object.uuid, index)
  return index
}

function findByUuid(root: Object3D, uuid: string): Object3D | null {
  let found: Object3D | null = null
  root.traverse((child) => {
    if (found == null && child.uuid === uuid) found = child
  })
  return found
}

function componentsFor(object: Object3D): string[] {
  const components = ['Transform', 'Visibility']
  if ((object as { isMesh?: boolean }).isMesh) components.push('Mesh')
  return components
}

type MeshLike = {
  isMesh?: boolean
  geometry?: { type?: string; parameters?: Record<string, unknown> }
  material?: { type?: string; color?: { getHexString(): string }; wireframe?: boolean }
}

/**
 * A stable, human-meaningful handle for an object.
 *
 * Almost nothing in this app sets `Object3D.name` — R3F scenes are described
 * by JSX structure, not by node names — so a plain name match would find
 * nothing at all. Falling back to `Type/GeometryType` gives an agent
 * something real to pattern-match on ("the Mesh with an ExtrudeGeometry"),
 * which is how you actually locate an object in an unnamed scene.
 */
function identityOf(object: Object3D): string {
  if (object.name) return object.name
  const geometry = (object as MeshLike).geometry?.type
  return geometry ? `${object.type}/${geometry}` : object.type
}

/** Geometry/material summary — the disambiguator when names are absent. */
function meshSummary(object: Object3D): Record<string, unknown> | null {
  const mesh = object as MeshLike
  if (!mesh.isMesh) return null
  const summary: Record<string, unknown> = {}
  if (mesh.geometry?.type) {
    summary.geometry = mesh.geometry.type
    // Scalars only. `ExtrudeGeometry.parameters.shapes` serializes an entire
    // curve list — hundreds of lines of context for no navigational value.
    const scalars: Record<string, number | string | boolean> = {}
    for (const [key, value] of Object.entries(mesh.geometry.parameters ?? {})) {
      const kind = typeof value
      if (kind === 'number' || kind === 'string' || kind === 'boolean') {
        scalars[key] = value as number | string | boolean
      }
    }
    if (Object.keys(scalars).length > 0) summary.geometryParameters = scalars
  }
  if (mesh.material?.type) {
    summary.material = mesh.material.type
    if (mesh.material.color) summary.color = `#${mesh.material.color.getHexString()}`
    if (mesh.material.wireframe) summary.wireframe = true
  }
  return Object.keys(summary).length > 0 ? summary : null
}

/** Playground-store fields an agent may write, with their validated setters. */
function playgroundSetters() {
  const store = usePlaygroundStore.getState()
  return {
    currentLab: (value: unknown) => {
      if (typeof value !== 'string' || !isValidLabId(value)) {
        throw new Error(`currentLab must be a valid lab id, got ${JSON.stringify(value)}`)
      }
      store.setLab(value)
    },
    themePresetId: (value: unknown) => {
      if (typeof value !== 'string' || !isValidPresetId(value)) {
        throw new Error(`themePresetId must be a valid preset id, got ${JSON.stringify(value)}`)
      }
      store.setThemePresetId(value)
    },
    fpsHudVisible: (value: unknown) => store.setFpsHudVisible(Boolean(value)),
    arAlignmentGuide: (value: unknown) => store.setArAlignmentGuide(Boolean(value)),
  }
}

function playgroundSnapshot() {
  const s = usePlaygroundStore.getState()
  return {
    currentLab: s.currentLab,
    themePresetId: s.themePresetId,
    fpsHudVisible: s.fpsHudVisible,
    arAlignmentGuide: s.arAlignmentGuide,
    originPosition: vec3(s.originPosition),
    originRotationY: s.originRotationY,
    logEntryCount: s.logEntries.length,
    hudReport: s.hudReport,
  }
}

/**
 * Session mode, mapped onto the same store calls the shell's "Enter VR" /
 * "Enter AR" buttons make.
 *
 * The plugin's own `xr_accept_session` can only take whatever mode the page
 * happens to be offering — for this app that resolves to `immersive-ar`,
 * whose emulated passthrough renders black. Exposing the app's own entry
 * points is what lets an agent reach the VR scene at all.
 */
function xrSessionSnapshot() {
  const state = xrStore.getState()
  return {
    mode: state.mode ?? null,
    sessionActive: state.session != null,
    hasOrigin: state.origin != null,
  }
}

async function setXrSessionMode(value: unknown) {
  if (value === null || value === 'none') {
    await xrStore.getState().session?.end()
    return
  }
  if (value === 'immersive-vr') {
    await xrStore.enterVR()
    return
  }
  if (value === 'immersive-ar') {
    await xrStore.enterAR()
    return
  }
  throw new Error(`mode must be "immersive-vr", "immersive-ar", or null — got ${JSON.stringify(value)}`)
}

/**
 * Hand/controller visuals, mapped onto the same `setHand`/`setController`
 * calls the labs use.
 *
 * `model: false` is the one knob an agent genuinely needs: the default hand
 * and controller models are fetched from the `@webxr-input-profiles` CDN at
 * session start, so on a machine without egress to it the load rejects and
 * takes the whole R3F canvas down with it. The models are cosmetic — joint
 * poses, pinch events and pointer rays all come from the runtime, not the
 * glTF — so turning them off is how you drive an input-heavy lab offline.
 */
function xrInputSnapshot() {
  const state = xrStore.getState()
  return { hand: state.hand ?? null, controller: state.controller ?? null }
}

function setXrInputField(field: string, value: unknown) {
  const state = xrStore.getState()
  if (field === 'handModel') {
    xrStore.setHand({ ...defaultXRHandConfig, ...(state.hand as object), model: Boolean(value) })
    return
  }
  if (field === 'controllerModel') {
    xrStore.setController({
      ...defaultXRControllerConfig,
      ...(state.controller as object),
      model: Boolean(value),
    })
    return
  }
  throw new Error(`XRInput accepts "handModel" or "controllerModel", got "${field}"`)
}

/** Leva values keyed by control path, skipping folders and button rows. */
function levaSnapshot(): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const data = levaStore.getData() as Record<string, { value?: unknown; type?: string }>
  for (const [path, entry] of Object.entries(data)) {
    if (entry == null || entry.type === 'BUTTON' || entry.type === 'FOLDER') continue
    if (!('value' in entry)) continue
    out[path] = entry.value
  }
  return out
}

type RuntimeDeps = {
  scene: Object3D
  advance: (timestamp: number, runGlobalEffects?: boolean) => void
  setFrameloop: (frameloop: 'always' | 'demand' | 'never') => void
  getFrameloop: () => 'always' | 'demand' | 'never'
}

function createRuntime(deps: RuntimeDeps) {
  /** Frameloop mode captured at pause, restored on resume. */
  let pausedFrom: 'always' | 'demand' | null = null
  /** Virtual clock for stepping, so each step advances by an exact delta. */
  let stepClock = 0

  function requireObject(params: Params): Object3D {
    const uuid =
      typeof params.uuid === 'string'
        ? params.uuid
        : typeof params.nodeId === 'string'
          ? params.nodeId
          : null
    if (uuid == null) throw new Error('Provide `uuid` (from scene_get_runtime_hierarchy)')
    const object = findByUuid(deps.scene, uuid)
    if (object == null) throw new Error(`No object with uuid ${uuid} in the live scene`)
    return object
  }

  function entityObject(entityIndex: number): Object3D {
    const uuid = uuidByEntity.get(entityIndex)
    if (uuid == null) throw new Error(`Unknown entity index ${entityIndex}`)
    const object = findByUuid(deps.scene, uuid)
    if (object == null) {
      throw new Error(`Entity ${entityIndex} (${uuid}) is no longer in the scene`)
    }
    return object
  }

  function describe(object: Object3D, depth: number, maxDepth: number): unknown {
    const node: Record<string, unknown> = {
      name: object.name || null,
      identity: identityOf(object),
      uuid: object.uuid,
      type: object.type,
      visible: object.visible,
      entityIndex: entityFor(object),
    }
    const mesh = meshSummary(object)
    if (mesh) node.mesh = mesh
    if (object.children.length === 0) return node
    if (depth >= maxDepth) {
      node.truncatedChildren = object.children.length
      return node
    }
    node.children = object.children.map((child) => describe(child, depth + 1, maxDepth))
    return node
  }

  const handlers: Record<string, (params: Params) => unknown> = {
    // ---- scene ----------------------------------------------------------
    get_scene_hierarchy(params) {
      const maxDepth = Math.max(1, Math.min(20, num(params.maxDepth, 5)))
      const root =
        typeof params.parentId === 'string' ? requireObject({ uuid: params.parentId }) : deps.scene
      return { root: describe(root, 0, maxDepth), maxDepth }
    },

    get_object_transform(params) {
      const object = requireObject(params)
      object.updateWorldMatrix(true, false)
      object.matrixWorld.decompose(_worldPos, _worldQuat, _worldScale)

      const origin = xrStore.getState().origin
      let positionRelativeToXROrigin: Vec3Json
      if (origin) {
        origin.updateWorldMatrix(true, false)
        positionRelativeToXROrigin = vec3(origin.worldToLocal(_relative.copy(_worldPos)))
      } else {
        // No XROrigin mounted yet — world space *is* origin space.
        positionRelativeToXROrigin = vec3(_worldPos)
      }

      return {
        uuid: object.uuid,
        name: object.name || null,
        type: object.type,
        visible: object.visible,
        local: {
          position: vec3(object.position),
          quaternion: quat(object.quaternion),
          scale: vec3(object.scale),
        },
        world: {
          position: vec3(_worldPos),
          quaternion: quat(_worldQuat),
          scale: vec3(_worldScale),
        },
        positionRelativeToXROrigin,
      }
    },

    // ---- frameloop ------------------------------------------------------
    //
    // The tool descriptions say pausing stops *systems* while the render loop
    // keeps running. This app has no system layer — the R3F frameloop is the
    // tick — so pausing necessarily stops rendering too. Screenshots still
    // work (the canvas holds its last frame); they just stop changing.
    ecs_pause() {
      const current = deps.getFrameloop()
      if (current !== 'never') pausedFrom = current
      deps.setFrameloop('never')
      stepClock = performance.now()
      return { paused: true, resumesTo: pausedFrom ?? 'always', note: 'R3F frameloop set to "never" — rendering is paused, not just simulation.' }
    },

    ecs_resume() {
      const resumeTo = pausedFrom ?? 'always'
      deps.setFrameloop(resumeTo)
      pausedFrom = null
      return { paused: false, frameloop: resumeTo }
    },

    ecs_step(params) {
      if (deps.getFrameloop() !== 'never') {
        throw new Error('Call ecs_pause before ecs_step')
      }
      const count = Math.max(1, Math.min(120, Math.round(num(params.count, 1))))
      const delta = num(params.delta, DEFAULT_STEP_DELTA)
      for (let i = 0; i < count; i += 1) {
        stepClock += delta * 1000
        deps.advance(stepClock)
      }
      return { stepped: count, delta, virtualClockMs: stepClock }
    },

    // ---- entities -------------------------------------------------------
    ecs_list_components() {
      return {
        components: [
          { id: 'PlaygroundStore', fields: Object.keys(playgroundSnapshot()) },
          { id: 'LevaControls', fields: Object.keys(levaSnapshot()) },
          { id: 'XRSession', fields: Object.keys(xrSessionSnapshot()) },
          { id: 'XRInput', fields: ['handModel', 'controllerModel'] },
          { id: 'Transform', fields: ['position', 'quaternion', 'scale'] },
          { id: 'Visibility', fields: ['visible'] },
        ],
        note: 'This app is not ECS-based. "Components" are the zustand stores, the Leva panel, and Object3D fields.',
      }
    },

    ecs_find_entities(params) {
      const limit = Math.max(1, Math.min(50, Math.round(num(params.limit, 50))))
      const pattern =
        typeof params.namePattern === 'string' ? new RegExp(params.namePattern, 'i') : null
      const withComponents = Array.isArray(params.withComponents)
        ? (params.withComponents as string[])
        : []

      const results: Record<string, unknown>[] = []

      const stores = [
        { entityIndex: PLAYGROUND_ENTITY, name: 'PlaygroundStore', components: ['PlaygroundStore'] },
        { entityIndex: LEVA_ENTITY, name: 'LevaControls', components: ['LevaControls'] },
        { entityIndex: XR_SESSION_ENTITY, name: 'XRSession', components: ['XRSession'] },
        { entityIndex: XR_INPUT_ENTITY, name: 'XRInput', components: ['XRInput'] },
      ]
      for (const store of stores) {
        if (pattern != null && !pattern.test(store.name)) continue
        results.push(store)
      }

      // `namePattern` is matched against `identityOf` — see its comment. World
      // position rides along because the reason to find an object here is
      // almost always to aim a hand or the headset at it.
      //
      // `matched` counts every hit but descriptors are only built up to
      // `limit`: an unfiltered query over a lab scene matches thousands of
      // nodes, and decomposing a world matrix for each one to then throw it
      // away is pure waste.
      const storeMatches = results.length
      let matched = 0
      deps.scene.traverse((object) => {
        const identity = identityOf(object)
        if (pattern != null && !pattern.test(identity)) return
        const components = componentsFor(object)
        if (withComponents.some((c) => !components.includes(c))) return
        matched += 1
        if (results.length >= limit) return
        object.updateWorldMatrix(true, false)
        object.matrixWorld.decompose(_worldPos, _worldQuat, _worldScale)
        const mesh = meshSummary(object)
        results.push({
          entityIndex: entityFor(object),
          name: object.name || null,
          identity,
          uuid: object.uuid,
          components,
          worldPosition: vec3(_worldPos),
          parentUuid: object.parent?.uuid ?? null,
          ...(mesh ? { mesh } : {}),
        })
      })

      return { entities: results, total: matched + storeMatches, limit }
    },

    ecs_query_entity(params) {
      const entityIndex = Math.round(num(params.entityIndex, NaN))
      if (!Number.isFinite(entityIndex)) throw new Error('entityIndex is required')

      if (entityIndex === PLAYGROUND_ENTITY) {
        return { entityIndex, name: 'PlaygroundStore', components: { PlaygroundStore: playgroundSnapshot() } }
      }
      if (entityIndex === LEVA_ENTITY) {
        return { entityIndex, name: 'LevaControls', components: { LevaControls: levaSnapshot() } }
      }
      if (entityIndex === XR_SESSION_ENTITY) {
        return { entityIndex, name: 'XRSession', components: { XRSession: xrSessionSnapshot() } }
      }
      if (entityIndex === XR_INPUT_ENTITY) {
        return { entityIndex, name: 'XRInput', components: { XRInput: xrInputSnapshot() } }
      }

      const object = entityObject(entityIndex)
      object.updateWorldMatrix(true, false)
      object.matrixWorld.decompose(_worldPos, _worldQuat, _worldScale)
      return {
        entityIndex,
        name: object.name,
        uuid: object.uuid,
        components: {
          Transform: {
            position: vec3(object.position),
            quaternion: quat(object.quaternion),
            scale: vec3(object.scale),
            worldPosition: vec3(_worldPos),
          },
          Visibility: { visible: object.visible },
        },
      }
    },

    async ecs_set_component(params) {
      const entityIndex = Math.round(num(params.entityIndex, NaN))
      const componentId = String(params.componentId ?? '')
      const field = String(params.field ?? '')
      const value = params.value

      if (entityIndex === XR_SESSION_ENTITY) {
        if (field !== 'mode') {
          throw new Error('XRSession only accepts the "mode" field')
        }
        await setXrSessionMode(value)
        return { entityIndex, componentId: 'XRSession', field, value, applied: true, ...xrSessionSnapshot() }
      }

      if (entityIndex === XR_INPUT_ENTITY) {
        setXrInputField(field, value)
        return { entityIndex, componentId: 'XRInput', field, value, applied: true }
      }

      if (entityIndex === PLAYGROUND_ENTITY) {
        const setters = playgroundSetters()
        const setter = setters[field as keyof ReturnType<typeof playgroundSetters>]
        if (!setter) {
          throw new Error(
            `PlaygroundStore.${field} is not agent-writable. Writable: ${Object.keys(setters).join(', ')}`,
          )
        }
        setter(value)
        return { entityIndex, componentId: 'PlaygroundStore', field, value, applied: true }
      }

      if (entityIndex === LEVA_ENTITY) {
        const data = levaStore.getData() as Record<string, unknown>
        if (!(field in data)) {
          throw new Error(`No Leva control at path "${field}". Query entity ${LEVA_ENTITY} for paths.`)
        }
        // `fromPanel: true` — an agent is standing in for a hand on the slider,
        // so the change should behave exactly like a panel edit.
        levaStore.setValueAtPath(field, value, true)
        return { entityIndex, componentId: 'LevaControls', field, value, applied: true }
      }

      const object = entityObject(entityIndex)
      if (componentId === 'Visibility' && field === 'visible') {
        object.visible = Boolean(value)
        return { entityIndex, componentId, field, value: object.visible, applied: true }
      }
      if (componentId === 'Transform') {
        const arr = Array.isArray(value) ? (value as number[]) : null
        if (arr == null) throw new Error('Transform fields take an array, e.g. [x, y, z]')
        if (field === 'position') object.position.fromArray(arr)
        else if (field === 'scale') object.scale.fromArray(arr)
        else if (field === 'quaternion') object.quaternion.fromArray(arr)
        else throw new Error(`Unknown Transform field "${field}"`)
        return { entityIndex, componentId, field, value: arr, applied: true }
      }
      throw new Error(`Cannot set ${componentId}.${field} on a scene object`)
    },
  }

  return {
    handles(method: string) {
      return Object.prototype.hasOwnProperty.call(handlers, method)
    },
    async dispatch(method: string, params: Params) {
      const handler = handlers[method]
      if (!handler) throw new Error(`FRAMEWORK_MCP_RUNTIME does not handle "${method}"`)
      return handler(params ?? {})
    },
  }
}

/**
 * Publishes the runtime for as long as it is mounted. Must live inside
 * `<Canvas>` — it reads the R3F root store for the scene and frameloop.
 */
export function AgentHarnessBridge() {
  const store = useThree((state) => state.scene)
  const advance = useThree((state) => state.advance)
  const setFrameloop = useThree((state) => state.setFrameloop)
  const getFrameloop = useThree((state) => state.get)

  useEffect(() => {
    const runtime = createRuntime({
      scene: store,
      advance,
      setFrameloop,
      getFrameloop: () => getFrameloop().frameloop,
    })
    window.FRAMEWORK_MCP_RUNTIME = runtime
    // The bridge reports `commandReady` in its connect handshake, which runs
    // long before React mounts. This is the event it listens for to
    // re-announce itself once a framework runtime shows up.
    window.dispatchEvent(new Event('iwsdk:mcp-runtime-ready'))
    console.info('[agent-harness] FRAMEWORK_MCP_RUNTIME installed')
    return () => {
      if (window.FRAMEWORK_MCP_RUNTIME === runtime) delete window.FRAMEWORK_MCP_RUNTIME
    }
  }, [store, advance, setFrameloop, getFrameloop])

  return null
}
