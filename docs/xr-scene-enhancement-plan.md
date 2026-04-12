# XR scene enhancement — execution plan

**Goal:** Move labs from “basic primitives” toward **art-directed, film-mood space** (playful institutional future per [xr-3d.md](./style-templates/xr-3d.md)) while honoring **Quest-class WebXR** constraints: low poly, ≤2 meaningful lights, no default post stack, minimal draw calls and texture bandwidth.

**Spec authority:** [xr-3d.md](./style-templates/xr-3d.md) (palette, materials policy, geometry limits, anti-patterns). **Broader program:** [spatial-polish-plan.md](./spatial-polish-plan.md) (theme context, file map, phase A–E). This document **narrows** the “cinematic set” track into implementable phases **after** shared foundations (fog, skydome, theme) exist.

**Non-goals (unless explicitly scoped + Quest-off):** full-screen post (bloom, SSAO), heavy HDR environment maps everywhere, high-poly hero assets, per-object unique PBR stacks.

---

## Principles (carry into every task)

1. **Composition over assets** — vertical bands (foreground / midground / background landmark) before new models.
2. **Color + emissive first** — textures only when large surfaces still read as “debug plastic.”
3. **Shared materials** — clone from a small library; dispose/update on preset change (see [spatial polish — XR consumption](./spatial-polish-plan.md#xr-consumption-pattern)).
4. **Measure on device** — [Meta WebXR performance best practices](https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/); watch overdraw and shadow cost.

---

## Performance budget (default VR path)

| Resource | Guideline |
|----------|-----------|
| Meaningful lights | **1 directional + 1 hemisphere**; no extra fill without review |
| Shadow casters | **Off** by default; **one** directional shadow only in labs that need contact grounding; minimal casters, tuned map size |
| Skydome | **One** unlit mesh; segment counts per [xr-3d.md](./style-templates/xr-3d.md#geometry--draw-call-discipline) |
| Textures (if introduced) | **Few**; prefer **one trim atlas** or ≤4 small maps; consider **KTX2 / Basis** for anything &gt;512² if you add a loader path |
| Unique materials | Cap **variants**; instanced or merged static set dressing where repeated |
| CPU | No new `Vector3` / `Color` **per frame** in lab hot paths |

---

## Phase 0 — Preconditions (already largely done)

Confirm before treating later phases as “done”:

- [ ] `xr` tokens flow through `PlaygroundThemeContext` (or equivalent); labs read accents from theme, not scattered hex.
- [ ] `SharedScene` / `VRScene`: fog, skydome, grid, floor aligned with [xr-3d.md](./style-templates/xr-3d.md) defaults.
- [ ] [Pitfalls](./pitfalls.md) reviewed before Leva-driven geometry or nested `Text`.

---

## Phase 1 — Staging vocabulary (procedural, no glTF)

**Outcome:** Every lab reads as a **deliberate set** using the vocabulary in [xr-3d.md](./style-templates/xr-3d.md#layout-vocabulary-labs): pedestals, backdrop arcs, path chevrons, landmark stack, rings, ghost preview language.

| Track | Tasks | Acceptance |
|-------|--------|------------|
| **Shared building blocks** | Add or extend `src/xr/visual/` (or lab-local modules consolidated later): rounded plinth, thin torus arc, brutalist “landmark” column (stacked boxes), optional chevron instances along a path | Each primitive respects segment budgets in xr-3d; uses `xr.accent.*` |
| **Selection lab** | Pedestal under targets + soft backdrop arc; vertical banding | Silhouette readable at 2–4 m; hover/select states not color-only |
| **Placement lab** | Floor band + placement ring + ghost with **emissive rim** per spec | Valid/invalid palette from per-lab routing table |
| **Locomotion lab** | Chevron or slab “runway” + **distant landmark** | User can infer direction without reading text |
| **Manipulation lab** | Workbench slab / institutional trim + docking volume reads as “hardware” | Dock vs held object clearly separated (mustard / orange per spec) |

**Done when:** All four labs use at least **two** vocabulary elements each; no lab is only untextured cubes on an empty plane.

---

## Phase 2 — Environment polish (still mostly code + existing skydome)

**Outcome:** The **void** feels continuous with the floor and horizon—“set inside a larger world” without new heavy assets.

| Task | Notes |
|------|--------|
| Skydome gradient bands | Strengthen **horizon** and **institutional dusk** read (warm band + cool zenith); keep **MeshBasicMaterial**, `depthWrite` policy per xr-3d |
| Fog / background cohesion | Ensure fog color family matches floor and skydome lower hemisphere ([Three.js fog](https://threejs.org/manual/en/fog.html) practice) |
| Landmark scale pass | Tune landmark height/distance so it **frames** the play volume without dominating triangles |

**Done when:** Quest spot-check: depth read improves vs flat void; FPS stable vs Phase 1 baseline (`InXRStats`).

---

## Phase 3 — Material refinement (no new texture pipeline required)

**Outcome:** Surfaces feel **intentional** using `MeshStandardMaterial` tuning from [xr-3d.md](./style-templates/xr-3d.md#materials).

| Task | Notes |
|------|--------|
| Floor / large masses | High roughness, no metalness; optional **very** low emissive from tokens |
| Interactive props | Mid roughness; emissive rims only for state |
| Shared material factory | e.g. `createPropMaterial('stone' \| 'trim' \| 'neon')` reading `xr` | Reduces ad-hoc `useMemo` duplication |

**Done when:** Set pieces and props are visually distinct by **roughness + color + emissive**, not by adding lights.

---

## Phase 4 — Optional hero assets (glTF pipeline)

**Outcome:** A **small** library of Draco-compressed glTF modules replaces the noisiest procedural-only areas.

| Task | Notes |
|------|--------|
| Authoring | Blender → glTF; **Draco** mesh compression; materials optional (Hello WebXR style: materials in code if easier) |
| Runtime | `useGLTF` + clones; **instance** repeated parts |
| Scope cap | 3–5 hero meshes total for v1 (e.g. seal ring, console slab, column capital) |

**Done when:** Total extra VR draw/time budget documented; Quest validation passes; fallback primitives remain if load fails.

---

## Phase 5 — Textures / lightmaps (only if Phase 3 insufficient)

**Outcome:** Large static surfaces gain weight without blowing material count.

| Path | When | Risk |
|------|------|------|
| **Single trim atlas** | Slabs + floors need micro-detail | UV discipline; one texture sample |
| **Baked lightmaps** | TVA-style stone “weight” | Second UV, bake pipeline, larger downloads |
| **KTX2 / Basis** | Any texture &gt;512² in production path | Loader + transcoding; test Quest browsers |

**Done when:** Texture count and resolution recorded; no regression on cold load or GPU memory vs Phase 3.

---

## Phase 6 — Advanced shading (strictly optional)

**Outcome:** Subtle premium read on **small** meshes only.

| Allowed | Forbidden (Quest default) |
|---------|---------------------------|
| Thin fresnel or edge highlight on manipulables / HUD-adjacent props | Full-screen post, heavy SSAO, bloom-dependent look |
| `onBeforeCompile` tweak on shared material | Unique shader per instance |

**Done when:** Shader variants counted; feature flagged or desktop-only if Quest regresses.

---

## Suggested implementation order

```text
Phase 0 (verify) → Phase 1 (staging) → Phase 2 (environment) → Phase 3 (materials)
    → Phase 4 (glTF) → Phase 5 (textures/lightmaps) → Phase 6 (shaders, optional)
```

Phases **4–6** are **explicitly gated**: do not start Phase 4 until Phase 1–3 are accepted on Quest.

---

## File map (expected touch points)

| Area | Paths |
|------|--------|
| Shared visuals | `src/xr/visual/*`, `SharedScene.tsx`, `VRScene.tsx` |
| Labs | `src/labs/*` (per-lab staging compositions) |
| Theme | `src/config/playgroundTheme.ts` — new token only when a value is reused ≥2 times |
| Assets (Phase 4+) | e.g. `public/models/` or `src/assets/` + preload strategy |

---

## Validation checklist (each phase)

- [ ] **Quest:** each lab, 60–90 s session, watch `InXRStats` and subjective comfort.
- [ ] **Preset switch:** no material leaks / wrong colors after theme change.
- [ ] **AR (cross-xr labs):** passthrough contrast; no huge additive quads without intent.
- [ ] **Docs:** update [xr-3d.md](./style-templates/xr-3d.md) only if tokens or policies change.

---

## Related links

- [xr-3d.md](./style-templates/xr-3d.md) — canonical 3D spec  
- [spatial-polish-plan.md](./spatial-polish-plan.md) — theme, HUD, AR overlay, phase A–E  
- [Mozilla Hello WebXR — visual development](https://blog.mozvr.com/visualdev-hello-webxr/) — glTF, materials-in-code, compression mindset  
- [MDN — WebXR performance](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Performance) — GC / allocation discipline  
