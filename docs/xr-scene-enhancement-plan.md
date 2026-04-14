# XR scene enhancement — execution plan

**Goal:** Replace placeholder staging with **authored spatial compositions** so each lab feels **intentional, legible, and exciting** at human scale. Stock-kit models are only support material. The outcome should read as a designed XR stage, not a debug scene with nicer props — still within [xr-3d.md](./style-templates/xr-3d.md) performance guardrails (Quest-first, ≤ 2 meaningful lights, no default post stack).

**Spec authority:** [xr-3d.md](./style-templates/xr-3d.md). **Program context:** [spatial-polish-plan.md](./spatial-polish-plan.md).

---

## Current status (what is already done)

These items are **complete** — do not redo them:

- [x] `playgroundTheme.ts` — full `shell` + `xr` tokens, presets, `levaThemeFromShell`, `getPlaygroundPreset`.
- [x] `PlaygroundThemeContext` — React context providing `xr`, `labAccents`, `presetId` to R3F tree.
- [x] `SharedScene.tsx` — 1 directional light + 1 hemisphere light from `xr.light.*` tokens.
- [x] `VRScene.tsx` — fog from `xr.fog.*`, floor plane from `xr.floor.*`, infinite grid from `xr.grid.*`, `<Skydome />`.
- [x] `Skydome.tsx` — gradient sphere (24×16 segments, vertex colors, `BackSide`, `depthWrite: false`).
- [x] Labs consume `usePlaygroundTheme()` for accent colors. Selection lab has a simple cylinder pedestal.

**What is done for kit staging:** `src/xr/visual/useKitModel.tsx` (`useKitModel`, `KitInstance`, `preloadXrKitModels`), `public/assets/models/xr-kit/*.glb` (run `npm run build:xr-kit`), `Suspense` + preload in `XRRoot`, Selection / Locomotion / Docking staging per Tasks 2–4, Debug height capsule in `VRScene` (Task 6).

**Still optional / human:** Task 5 (Placement pedestal), Task 7 (Quest validation, tri/draw counts).

---

## Execution tracker

Use this section as the working status board for the enhancement pass. Update it whenever a phase changes state so implementation decisions stay tied to the plan.

### Phase status

| Phase | Scope | Status | Notes |
|------|-------|--------|-------|
| **A** | Theme core + shared XR foundations | **Done** | Theme tokens, scene lights, fog, floor, skydome, HUD panel baseline all landed. |
| **B** | Asset pipeline + kit loading | **Done** | `xr-kit/*.glb`, build script, preload, and `useKitModel` landed. |
| **C** | Desktop preview framing | **Done** | Authored desktop camera views now frame labs outside XR. |
| **D** | Selection recovery pass | **Done** | Stage, backdrop gesture, and stronger comparison composition landed; the scene now also captures initial eye height and lifts the whole stage together for better first-entry framing. |
| **E** | Locomotion recovery pass | **Done** | Second pass expanded the teleport footprint, opened the corridor read, and added a real landing zone inside the destination space. |
| **F** | Docking recovery pass | **Done** | Second pass lowered/simplified the station so the ghost target stays visible across the full trial volume, then added initial eye-level anchoring so the whole bench reads correctly on first entry. |
| **G** | Placement recovery pass | **Done** | Second pass rebuilt placement around one active-source preview, direct `selectstart` confirmation, scale-locked placements, and hand/controller hit-test fallback. |
| **H** | Quest validation + perf logging | **Next (human)** | Validate readability, scale, triangles, draw calls, and frame time on device. |

### Current focus

- **Right now:** Phase **H — Quest validation + perf logging** against the second-pass locomotion, docking, and placement fixes
- **After that:** decide whether any lab needs a second refinement pass from headset findings
- **Then:** close Phase 4 and move attention to Phase 5

### Working rules for this tracker

- Only mark a lab phase **Done** when the lab satisfies the replacement brief above, not when a few props have been added.
- If a phase reveals a new blocker or subproblem, add it as a short note in the phase table instead of creating hidden scratch plans elsewhere.
- Keep this tracker aligned with the higher-level status in [roadmap.md](./roadmap.md).

---

## Replacement brief (read this before implementing more kit work)

The first version of this plan leaned too hard on **asset substitution**. That improves credibility a little, but it does **not** automatically create drama, focus, or spatial identity. From this point on, treat stock kit parts as **raw material** for composing a stage, not as the stage itself.

If a scene still reads as:

- a few interactables floating in open void
- a straight line of props on a grid
- a hero interaction object that is still a debug primitive
- a backdrop piece that sits somewhere nearby but does not frame the action

then the scene is **not solved**, even if every primitive has been swapped for a `.glb`.

### What success should feel like

Each lab should communicate a short, readable spatial story within 2–3 seconds:

- **Where should I look first?**
- **What is the ritual here?**
- **What is the depth structure of this space?**
- **What is the payoff or destination?**

The interaction target must feel like the **hero** of the scene. Supporting architecture exists to frame, reinforce, and dramatize that hero.

### Non-negotiable spatial requirements

Every lab pass must satisfy all of the following:

1. **Foreground / midground / background** are deliberately authored.
   - Foreground = the immediate interaction surface or object family.
   - Midground = the active task zone.
   - Background = one readable landmark, enclosure, or payoff.
2. **One strong framing gesture** exists.
   - Examples: arc, portal, wall band, corridor mouth, bench surround, ring, side rails.
   - A lone prop in empty space is not framing.
3. **The hero interaction reads first.**
   - The thing the user touches or manipulates must be the clearest silhouette, clearest contrast, or strongest accent in the scene.
   - Background detail must not outshine the interactive object.
4. **Space has directional intent.**
   - The scene should encourage a glance path or body orientation.
   - If locomotion is involved, there must be a destination.
5. **Desktop preview must communicate the stage.**
   - Since this playground depends on fast desktop iteration, the non-XR camera framing must show the composition clearly enough to judge silhouette, spacing, and focal hierarchy.

### Failure modes to reject

Reject a pass if any of the following are true:

- The scene is still mostly a dark floor and empty void with a few placed assets.
- The main composition only becomes understandable after reading labels.
- The kit props feel sprinkled in rather than structurally related.
- The most visually detailed object is not the one the user interacts with.
- The only "improvement" is muted sci-fi decoration behind the same prototype geometry.

---

## Design principles (reference — do not delete)

1. **Readable role at 2 m** — silhouette + scale, not labels.
2. **Hero-first** — the interactive object or surface must visually win.
3. **Institutional, not toy** — large surfaces muted; accents thin, linear, or rim-only.
4. **Asymmetry with intent** — offsets, one strong vertical, framed negative space, purposeful imbalance.
5. **Human-scaled** — check against ~1.7 m reference.
6. **Performance** — ≤ 2 lights, instancing for repeats, ≤ 100 K tris per scene, ≤ 50 draw calls target.

---

## Performance budget

| Resource | Hard limit |
|----------|-----------|
| Lights | **1 directional + 1 hemisphere** (already in `SharedScene`) |
| Shadows | Off by default; one shadow caster only if grounding is worth the cost |
| Tris per scene | Target **≤ 100 K** total (validate with `renderer.info` on Quest) |
| Draw calls | Target **≤ 50** (use instancing for repeated kit parts) |
| Textures | **≤ 3** texture sets loaded per scene; shared across kit pieces |
| Materials | Shared families: stone, trim, emissive accent. Do not create unique materials per mesh |

---

## Curated stock assets (in repo)

All packs live under `public/assets/models/`.

### Pack inventory (trimmed repo)

Only the paths below are kept under `public/assets/models/`. Duplicate formats and marketing files were removed to shrink clone size (~67 MB total for models; was ~223 MB).

| Priority | Pack (folder) | What remains on disk | Best for | ~Size |
|----------|---------------|----------------------|----------|-------|
| **1 — Structure** | `Modular SciFi MegaKit[Standard]/` | `glTF/` + `Textures/` + `License_Standard.txt` | Lab backdrops (convert to `xr-kit/*.glb` in Task 0) | ~33 MB |
| **2 — Props** | `Molten Maps SciFi Asset Pack/` | `Assets/gtlf/*.glb` + `License.txt` | Consoles, screens, instruments | ~26 MB |
| **3 — Blockout** | `kenney_modular-space-kit_1.0/` | `Models/OBJ format/` + `Models/Textures/` + `License.txt` | Fast room/corridor OBJ blockout | ~7 MB |
| **4 — Fill** | `kenney_space-station-kit/` | `Models/GLB format/` + `Models/Textures/` + `License.txt` | Extra station props | ~1 MB |

**Not in repo:** `kenney_space-kit/` (isometric/side sprites, not XR scene meshes). Do not re-add unless you have a specific mesh need from its `GLTF` folder and accept the extra weight.

### What was removed (do not restore unless you need that format)

| Pack | Removed |
|------|---------|
| **MegaKit** | `FBX/`, `FBX (Unity)/`, `OBJ/`, `Preview_*.png` — Web path uses **glTF + shared Textures** only. |
| **Molten Maps** | `Examples/`, `Assets/fbx/`, `Assets/obj/`, `Assets/Textures + Materials/`, root `*.url` — GLBs are self-contained. |
| **Kenney modular** | `Models/FBX format/`, `Models/GLB format/`, previews, `Overview.html`, `*.url` — keep **OBJ + Textures** for the documented blockout path. |
| **Kenney space-station** | `Models/FBX format/`, `Models/OBJ format/`, previews, `Overview.html`, `*.url` — keep **GLB + Textures**. |
| **Kenney space-kit** | **Entire folder** — not part of the XR kit plan. |

> **Note:** The Molten Maps folder is named `gtlf/` (typo in the original pack, not `gltf/`). Do not rename it without updating any loader paths.

### Known issues with stock assets

**MegaKit textures are broken out of the box.** The `.gltf` files reference textures by filename (e.g. `T_Trim_03_BaseColor.png`) but the PNGs live in `Textures/` at the pack root, not next to the `.gltf` files. **Every MegaKit model will 404 on textures if loaded as-is.**

**Fix required before using MegaKit (Task 0 below):** Convert needed `.gltf` → self-contained `.glb` using `gltf-transform` so textures are embedded. Output to `public/assets/models/xr-kit/`.

**Kenney modular is OBJ+MTL.** `useGLTF` cannot load OBJ. Either convert to `.glb` first, or use `useLoader(OBJLoader, ...)` from `three/addons`. Prefer converting to `.glb` for consistency.

---

## Kit piece mapping (stock → lab role)

Each row maps a **lab staging role** to a **specific stock model** to use. This is the shopping list.

| Role | Lab(s) | Stock model to use | Source pack |
|------|--------|--------------------|------------|
| **Pedestal** | Selection | `Platform_Round1.gltf` or `Platform_Simple.gltf` | MegaKit Platforms |
| **Backdrop wall** | Selection, Locomotion | `TopPlastic_Straight.gltf` + `BottomSimple_Straight.gltf` (stacked) | MegaKit Walls |
| **Column / landmark** | Locomotion (far band) | `Column_Astra.gltf` or `Column_Hollow.gltf` | MegaKit Columns |
| **Console / workbench** | Manipulation (Docking) | `Prop_Computer.glb` or `Briefing_Screen_Blue.glb` | MegaKit Props / Molten Maps |
| **Rails / path** | Locomotion | `Prop_Rail_4.gltf` (instanced) | MegaKit Props |
| **Clutter / detail** | Any (optional) | `Prop_Vent_Small.gltf`, `Prop_Cable_1.gltf` | MegaKit Props |
| **Zen Garden** | Manipulation (Zen) | **Keep existing procedural staging** (wooden tray, sand, petals) — do NOT replace with sci-fi kit | N/A |

> **Zen Garden exception:** `ZenGardenMode.tsx` already has purpose-built nature staging (wooden tray, sand texture, cherry petals, organic objects). The sci-fi stock kit is **wrong** for this context. Leave it as-is; only apply stock kit to Docking Mode and shared lab shells.

---

## Per-lab experiential targets

These replace the weaker "just add some kit pieces" interpretation.

### Selection Lab — ceremonial comparison stage

**Desired read:** three offerings on a deliberate stage, with a clear comparison rhythm and one containing frame behind them.

**Must have:**

- Three pedestals arranged as a **shallow arc or horseshoe**, not just three isolated objects.
- A **single backdrop gesture** behind them: curved arc, segmented wall band, or portal-like frame.
- A darker base plane or plinth zone anchoring the set to the floor.
- One taller landmark offset behind the composition for vertical rhythm, not as random distant clutter.

**Must avoid:**

- Three cubes floating in open void with unrelated columns in the distance.
- Labels doing the work of spatial organization.

### Locomotion Lab — route with payoff

**Desired read:** departure zone, guided travel path, and destination landmark that rewards forward attention.

**Must have:**

- A **launch zone** around the user start position.
- A forward **path rhythm** that feels designed: chevrons, segmented rails, or floor banding.
- A **destination space ahead**: monolith, doorway, portal, overlook, or framed terminal.
- At least a partial **corridor or runway enclosure**, created by side pieces, not just floor dressing.

**Must avoid:**

- A sparse line of path cues with no clear endpoint.
- The only architectural anchor being behind the player.

### Docking Mode — instrumented workbench

**Desired read:** a precision manipulation station where the docking object is the obvious hero and the station explains the task.

**Must have:**

- A bench, cradle, or fixture that makes the target volume feel **mounted** in a station, not floating in space.
- The manipulable object upgraded from raw debug cube to a more authored, asymmetric object, while preserving the experiment's rotational readability.
- Instrument surfaces or readouts that frame the task laterally or rearward.
- Clear contrast between **held object**, **target ghost**, and **support structure**.

**Must avoid:**

- Decorating a raw cube with a background computer and calling the scene finished.
- Making the bench more visually interesting than the object under study.

### Placement Lab — minimal but authored AR ritual

**Desired read:** a clean placement ritual with an explicit footprint, ghost, and confirmation state.

**Must have:**

- A deliberate **ring / footprint** language on the hit plane.
- A ghost object whose silhouette and edge treatment communicate validity.
- A clear visual distinction between preview, valid placement, invalid placement, and confirmed placement.

**Must avoid:**

- Default sphere/box previews with color alone doing all the work.

### Zen Garden — keep the custom language

Zen Garden already succeeds because it has a center, object family, material contrast, and a clear ritual. Do not contaminate it with stock sci-fi kit. If anything, future work should sharpen tray composition and object silhouettes, not change the theme.

---

## Implementation tasks (ordered, sequential)

Each task is a single unit of work. Complete them in order. **Do not skip ahead.**

### Task 0 — Asset preparation (run once)

**What:** Convert MegaKit `.gltf` models to self-contained `.glb` with embedded textures.

**Steps:**

1. Install dependencies (includes `@gltf-transform/cli`):
   ```bash
   npm install
   ```

2. Build all kit `.glb` files (copies MegaKit glTF + shared textures into a temp folder, then runs `gltf-transform copy` for each model, plus Molten `briefing_screen`):
   ```bash
   npm run build:xr-kit
   ```
   Script: `scripts/build-xr-kit-glb.mjs`.

3. The script already converts the minimum set below. If you add models, extend `scripts/build-xr-kit-glb.mjs` or run `gltf-transform copy` by hand (copy shared `Textures/*.png` next to the `.gltf` first if URIs fail).

   Models in the script (minimum set):
   - `glTF/Platforms/Platform_Round1.gltf` → `xr-kit/platform_round.glb`
   - `glTF/Platforms/Platform_Simple.gltf` → `xr-kit/platform_simple.glb`
   - `glTF/Columns/Column_Astra.gltf` → `xr-kit/column_astra.glb`
   - `glTF/Columns/Column_Hollow.gltf` → `xr-kit/column_hollow.glb`
   - `glTF/Props/Prop_Computer.gltf` → `xr-kit/prop_computer.glb`
   - `glTF/Props/Prop_Rail_4.gltf` → `xr-kit/prop_rail.glb`
   - `glTF/Walls/TopPlastic_Straight.gltf` → `xr-kit/wall_top_straight.glb`
   - `glTF/Walls/BottomSimple_Straight.gltf` → `xr-kit/wall_bottom_straight.glb`

4. Molten `briefing_screen.glb` is copied by the same script.

5. Verify (optional):
   ```bash
   npx gltf-transform inspect public/assets/models/xr-kit/platform_round.glb
   ```

**Done when:** `public/assets/models/xr-kit/` contains all `.glb` files listed above, each loads without texture errors.

---

### Task 1 — Shared `useKitModel` hook

**What:** Create a shared hook in `src/xr/visual/useKitModel.ts` that loads and optionally retints a kit `.glb`.

**File to create:** `src/xr/visual/useKitModel.tsx` (JSX for `KitInstance`)

**Behavior:**
```typescript
import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import { MeshStandardMaterial, Color } from 'three'
import type { GLTF } from 'three-stdlib'

const KIT_BASE = '/assets/models/xr-kit/'

type KitModelOptions = {
  color?: string        // override albedo
  emissive?: string     // override emissive
  roughness?: number    // override roughness
}

export function useKitModel(name: string, options?: KitModelOptions) {
  const gltf = useGLTF(`${KIT_BASE}${name}.glb`) as GLTF
  // Clone the scene so multiple instances don't share materials
  const scene = useMemo(() => {
    const cloned = gltf.scene.clone(true)
    if (options) {
      cloned.traverse((child) => {
        if ((child as any).isMesh) {
          const mat = ((child as any).material as MeshStandardMaterial).clone()
          if (options.color) mat.color = new Color(options.color)
          if (options.emissive) mat.emissive = new Color(options.emissive)
          if (options.roughness !== undefined) mat.roughness = options.roughness
          ;(child as any).material = mat
        }
      })
    }
    return cloned
  }, [gltf, options?.color, options?.emissive, options?.roughness])

  return scene
}
```

**Also:** Add `useGLTF.preload` calls for commonly used models at the bottom of the file or in a separate `src/xr/visual/preloadKit.ts`.

**Done when:** Importing `useKitModel('platform_round')` returns a cloned `Object3D` ready to add to the scene. A simple test component can render `<primitive object={scene} />`.

---

### Task 2 — Selection Lab staging upgrade

**What:** Turn Selection into a composed comparison stage, not just three kit pedestals.

**File to modify:** `src/labs/cross-xr/SelectionLab.tsx`

**Current code (lines 40-48):** The `SelectableTarget` component has a `<mesh>` with `<cylinderGeometry>` for the pedestal.

**Changes:**
1. Keep the pedestal upgrade, but re-block the three targets into a deliberate shallow arc.
2. Add a **backdrop frame** behind them using either:
   - custom low-poly arc geometry, or
   - a segmented wall composition that reads as one gesture.
3. Add a grounded stage zone under the comparison area so the set does not dissolve into the infinite floor.
4. Ensure the targets remain the strongest focal read; pedestals and backdrop are support only.

**Done when:** At a glance, the scene reads as a curated comparison ritual with a foreground stage, a midground interaction band, and a single background frame.

---

### Task 3 — Locomotion Lab staging upgrade

**What:** Turn Locomotion into a journey with a visible payoff.

**File to modify:** `src/labs/vr/LocomotionLab.tsx`

**Changes:**
1. Keep path guides, but make them read as a designed runway rather than repeated props.
2. Place the main architectural payoff **ahead** of the player, not behind.
3. Add side structure or partial enclosure so the route feels authored, even if still open.
4. Preserve teleport readability; the path should support teleportation, not compete with it.

**Done when:** The user can instantly read a start zone, a route, and a destination space ahead.

---

### Task 4 — Manipulation Lab (Docking Mode only) staging upgrade

**What:** Elevate Docking into a precision station whose hero is the manipulated object.

**File to modify:** `src/labs/cross-xr/manipulation/DockingMode.tsx`

**Changes:**
1. Add a proper work surface or fixture around the docking origin so the task feels mounted.
2. Replace the raw docking cube with an authored asymmetric form that still exposes rotation clearly for the experiment.
3. Use consoles/screens as framing devices, not as the primary point of interest.
4. Keep the manipulation math and experiment logic unchanged.

**Do NOT modify `ZenGardenMode.tsx`** — its nature-themed staging is intentional and complete.

**Done when:** The manipulated object is clearly the hero, the station explains the task, and the scene no longer reads like debug geometry with backdrop decor.

---

### Task 4.5 — Desktop preview framing

**What:** Add an authored desktop camera/default view for non-XR iteration.

**Why:** This playground depends on fast desktop iteration. If the desktop view reads as distant and empty, spatial work will be misjudged even when the in-headset scene improves.

**Changes:**
1. Add a default desktop camera position/target that frames the active lab stage.
2. Keep XR session behavior unchanged.
3. Revisit lab spacing after the desktop framing is in place; some layouts that barely work in-headset will read as tiny from desktop.

**Done when:** Opening the app on desktop gives a clear, reviewable shot of the active lab composition without entering XR.

---

### Task 5 — Placement Lab staging (optional, low priority)

**What:** The Placement Lab is AR-only and uses hit-test surfaces. Stock kit models are less relevant here. If desired, add a small `Platform_Round1` as a "launch pedestal" for the object being placed, visible before the user places it.

**Done when:** Placement lab optionally has one kit pedestal. AR hit-test flow unchanged.

---

### Task 6 — Human height reference (debug toggle)

**What:** Add a toggleable 1.7 m wireframe capsule to `VRScene.tsx` for scale checking.

**File to modify:** `src/xr/scene/VRScene.tsx`

**Changes:**
1. Add a Leva toggle `showHeightRef` (default `false`) under a "Debug" folder.
2. When enabled, render a wireframe capsule (cylinder + two half-spheres, or `CapsuleGeometry`) at `[1, 0.85, -1]` (standing beside the user), height 1.7 m, color `#666`, wireframe, no shadows.

**Done when:** Toggling the control shows/hides the reference. It does not affect performance when hidden (conditional render, not visibility toggle).

---

### Task 7 — Validation (human required)

These checks require a person in a headset:

- [ ] **Quest frame time**: run each lab with `InXRStats` visible. Target: stable 72 fps with kit models loaded.
- [ ] **Silhouette test**: "Can I name what that object is for from 2 m away?" If no → adjust scale or swap model.
- [ ] **AR passthrough**: kit models (if visible in AR) don't blow out contrast.
- [ ] **Zen Garden**: confirm it was NOT modified — still has wooden tray, sand, petals.
- [ ] Run `renderer.info.render.triangles` and `renderer.info.render.calls` — log results. Tris ≤ 100 K, calls ≤ 50.

---

## File map

| Area | Path | Status |
|------|------|--------|
| Converted kit models | `public/assets/models/xr-kit/*.glb` | **Create in Task 0** |
| Stock packs (source) | `public/assets/models/Modular SciFi MegaKit[Standard]/`, `Molten Maps SciFi Asset Pack/`, `kenney_modular-space-kit_1.0/`, `kenney_space-station-kit/` | On disk, not loaded by app |
| Kit loader hook | `src/xr/visual/useKitModel.tsx` | **Done** |
| Kit preloader | `src/xr/visual/preloadKit.ts` (optional) | Create if needed |
| Skydome | `src/xr/visual/Skydome.tsx` | Done |
| Scene foundations | `src/xr/scene/SharedScene.tsx`, `VRScene.tsx`, `ARScene.tsx` | Done (lights, fog, grid, skydome) |
| Theme | `src/config/playgroundTheme.ts` | Done |
| Labs | `src/labs/*` | Modify in Tasks 2–5 |

---

## Quality bar (reference)

| Intended vocabulary | Fails (reject) | Passes (accept) |
|---------------------|----------------|-----------------|
| **Hero object** | Raw debug primitive remains the visual focus | Authored silhouette with clear interaction read; strongest focal priority in scene |
| **Pedestal / support** | Raw `cylinderGeometry` or `boxGeometry` with no relation to composition | Support surface clearly belongs to a larger stage and reinforces the hero |
| **Backdrop frame** | Nothing behind targets, or one unrelated prop nearby | One readable framing gesture that contains the task zone |
| **Landmark / payoff** | No depth cue or destination | Clear background landmark or destination space that completes the composition |
| **Path / route** | Scattered repeated props on a grid | Rhythmic route with directional intent and visible payoff |
| **Console / instrument** | Generic prop pasted into scene | Instrument surface that supports the task without stealing focus |
| **Zen Garden** | Replaced with sci-fi kit | **Untouched** — keeps wooden tray, sand, petals, organic objects |

**Hard rule:** If the only difference from the previous debug scene is nicer assets or nicer hex colors, the task is **not done**.

---

## Related docs

- [xr-3d.md](./style-templates/xr-3d.md) — palette, materials, geometry caps, HUD
- [spatial-polish-plan.md](./spatial-polish-plan.md) — theme pipeline, phase acceptance
- [pitfalls.md](./pitfalls.md) — Leva + `Text` + WebXR gotchas
- [overview.md](./overview.md) — architecture, directory map
