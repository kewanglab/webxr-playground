# XR scene enhancement — execution plan

**Goal:** Replace placeholder primitives in lab staging with stock-kit models so labs feel **credible, cinematic-adjacent, and adult** — still within [xr-3d.md](./style-templates/xr-3d.md) performance guardrails (Quest-first, ≤ 2 meaningful lights, no default post stack).

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

**What is NOT done:** Labs still use raw `BoxGeometry` / `cylinderGeometry` for staging. No stock models are loaded yet. No `useGLTF` helper exists. No `src/xr/visual/` kit infrastructure beyond `Skydome.tsx`.

---

## Design principles (reference — do not delete)

1. **Readable role at 2 m** — silhouette + scale, not labels.
2. **Institutional, not toy** — large surfaces muted; accents thin, linear, or rim-only.
3. **Asymmetry** — offsets, one strong vertical, cutouts.
4. **Human-scaled** — check against ~1.7 m reference.
5. **Performance** — ≤ 2 lights, instancing for repeats, ≤ 100 K tris per scene, ≤ 50 draw calls target.

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

### Pack inventory

| Priority | Pack (folder) | Format | Best for | Size on disk |
|----------|---------------|--------|----------|-------------|
| **1 — Structure** | `Modular SciFi MegaKit[Standard]/` | `.gltf` + `.bin` under `glTF/` (Walls, Platforms, Props, Columns, Decals, Aliens) | Lab backdrops, walls, platforms, columns | 5.5 MB |
| **2 — Props** | `Molten Maps SciFi Asset Pack/Assets/gtlf/` | Self-contained `.glb` (~136 files) | Consoles, screens, instruments | 26 MB |
| **3 — Blockout** | `kenney_modular-space-kit_1.0/` | `Models/OBJ format/` + `.mtl` | Fast room/corridor layout (needs material pass) | 21 MB |
| **4 — Fill** | `kenney_space-station-kit/Models/GLB format/` | `.glb` | Extra station clutter | 6.2 MB |
| **Skip** | `kenney_space-kit/` | Mixed; `Isometric/` and `Side/` are 2D sprites | Not useful for XR scenes | 22 MB |

> **Note:** The Molten Maps folder is named `gtlf/` (typo in the original pack, not `gltf/`). Do not "fix" this path — it matches what is on disk.

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

## Implementation tasks (ordered, sequential)

Each task is a single unit of work. Complete them in order. **Do not skip ahead.**

### Task 0 — Asset preparation (run once)

**What:** Convert MegaKit `.gltf` models to self-contained `.glb` with embedded textures.

**Steps:**

1. Install `gltf-transform`:
   ```bash
   npm install --save-dev @gltf-transform/cli
   ```

2. Create the output directory:
   ```bash
   mkdir -p public/assets/models/xr-kit
   ```

3. For each model listed in the "Kit piece mapping" table above, run:
   ```bash
   npx gltf-transform copy \
     "public/assets/models/Modular SciFi MegaKit[Standard]/glTF/<Subfolder>/<Model>.gltf" \
     "public/assets/models/xr-kit/<model_name>.glb" \
     --allow-http
   ```
   If `gltf-transform copy` cannot resolve the textures (because they are in `../Textures/`), manually copy the needed `.png` files into the same folder as the `.gltf` first, then run the command.

   Models to convert (minimum set):
   - `glTF/Platforms/Platform_Round1.gltf` → `xr-kit/platform_round.glb`
   - `glTF/Platforms/Platform_Simple.gltf` → `xr-kit/platform_simple.glb`
   - `glTF/Columns/Column_Astra.gltf` → `xr-kit/column_astra.glb`
   - `glTF/Columns/Column_Hollow.gltf` → `xr-kit/column_hollow.glb`
   - `glTF/Props/Prop_Computer.gltf` → `xr-kit/prop_computer.glb`
   - `glTF/Props/Prop_Rail_4.gltf` → `xr-kit/prop_rail.glb`
   - `glTF/Walls/TopPlastic_Straight.gltf` → `xr-kit/wall_top_straight.glb`
   - `glTF/Walls/BottomSimple_Straight.gltf` → `xr-kit/wall_bottom_straight.glb`

4. Copy Molten Maps props that are needed (already `.glb`, no conversion):
   ```bash
   cp "public/assets/models/Molten Maps SciFi Asset Pack/Assets/gtlf/Briefing_Screen_Blue.glb" \
      public/assets/models/xr-kit/briefing_screen.glb
   ```

5. Verify all `.glb` files load without errors:
   ```bash
   npx gltf-transform inspect public/assets/models/xr-kit/platform_round.glb
   ```

**Done when:** `public/assets/models/xr-kit/` contains all `.glb` files listed above, each loads without texture errors.

---

### Task 1 — Shared `useKitModel` hook

**What:** Create a shared hook in `src/xr/visual/useKitModel.ts` that loads and optionally retints a kit `.glb`.

**File to create:** `src/xr/visual/useKitModel.ts`

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

**What:** Replace the inline `cylinderGeometry` pedestal in `SelectionLab.tsx` with a kit model.

**File to modify:** `src/labs/cross-xr/SelectionLab.tsx`

**Current code (lines 40-48):** The `SelectableTarget` component has a `<mesh>` with `<cylinderGeometry>` for the pedestal.

**Changes:**
1. Import `useKitModel` from `../../xr/visual/useKitModel`.
2. Replace the pedestal `<mesh>` with:
   ```tsx
   const pedestal = useKitModel('platform_round', {
     color: xr.accent.stone,
     emissive: xr.accent.mustard,
     roughness: 0.85,
   })
   // ...
   <primitive object={pedestal} position={[0, -size * 0.42, 0]} scale={[size * 0.8, size * 0.25, size * 0.8]} />
   ```
3. Adjust `scale` and `position` in headset until the pedestal reads at waist-chest height (~0.3–0.5 m) and the interactable box sits naturally on top.

**Optional:** Add one or two `Column_Astra` models in the far background (z = -8 to -12) at ~3 m tall as landmarks, tinted `xr.accent.stone`.

**Done when:** Selection lab renders kit-model pedestals instead of raw cylinders. Interactable boxes still work identically (pointer events, hover, select).

---

### Task 3 — Locomotion Lab staging upgrade

**What:** Add backdrop and landmark to `LocomotionLab.tsx`.

**File to modify:** `src/labs/vr/LocomotionLab.tsx`

**Changes:**
1. Add 2–3 `Column_Hollow` or `Column_Astra` models at varying distances (z = -6, -10, -15) as landmarks. Tint with `xr.accent.stone`. Scale tallest to ~4 m.
2. Add `Prop_Rail_4` instanced along the teleport floor as path guides. Space at 2 m intervals along z-axis. Tint with `xr.accent.cyan`, low emissive.
3. Optionally add one `wall_top_straight` + `wall_bottom_straight` stacked behind the start position as a "room entry" anchor.

**Done when:** Locomotion lab has visible depth cues and a landmark readable at fog distance. Teleport still works. No new lights added.

---

### Task 4 — Manipulation Lab (Docking Mode only) staging upgrade

**What:** Add a console/workbench prop behind the docking area.

**File to modify:** `src/labs/cross-xr/manipulation/DockingMode.tsx`

**Changes:**
1. Add one `prop_computer` or `briefing_screen` model behind the docking target area (z ≈ -1.2, y ≈ 0.8) as a "readout console."
2. Tint with `xr.accent.stone` base, `xr.accent.cyan` emissive at 0.15 intensity.
3. Add one `platform_simple` under the docking origin as a workbench surface.

**Do NOT modify `ZenGardenMode.tsx`** — its nature-themed staging is intentional and complete.

**Done when:** Docking mode has a visible institutional backdrop. Manipulation interaction is unchanged. Zen Garden is untouched.

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
| Kit loader hook | `src/xr/visual/useKitModel.ts` | **Create in Task 1** |
| Kit preloader | `src/xr/visual/preloadKit.ts` (optional) | Create if needed |
| Skydome | `src/xr/visual/Skydome.tsx` | Done |
| Scene foundations | `src/xr/scene/SharedScene.tsx`, `VRScene.tsx`, `ARScene.tsx` | Done (lights, fog, grid, skydome) |
| Theme | `src/config/playgroundTheme.ts` | Done |
| Labs | `src/labs/*` | Modify in Tasks 2–5 |

---

## Quality bar (reference)

| Intended vocabulary | Fails (reject) | Passes (accept) |
|---------------------|----------------|-----------------|
| **Pedestal** | Raw `cylinderGeometry` or `boxGeometry` | Kit model (`platform_round.glb`) tinted with `xr.accent.stone` + `mustard` rim emissive |
| **Backdrop wall** | Nothing behind targets | At least one wall or column from kit, anchored to floor |
| **Landmark** | No depth cue | Column visible at fog distance, taller than foreground props |
| **Console** | Single slab | Kit prop (`prop_computer.glb` or `briefing_screen.glb`) with panel detail |
| **Zen Garden** | Replaced with sci-fi kit | **Untouched** — keeps wooden tray, sand, petals, organic objects |

**Hard rule:** If the only difference from the previous debug scene is hex colors, the task is **not done**.

---

## Related docs

- [xr-3d.md](./style-templates/xr-3d.md) — palette, materials, geometry caps, HUD
- [spatial-polish-plan.md](./spatial-polish-plan.md) — theme pipeline, phase acceptance
- [pitfalls.md](./pitfalls.md) — Leva + `Text` + WebXR gotchas
- [overview.md](./overview.md) — architecture, directory map
