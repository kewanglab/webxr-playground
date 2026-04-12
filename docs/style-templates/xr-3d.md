# Style template: XR (3D scene & objects)

**Intent:** **Playful institutional future**—*The Fifth Element*’s bold orange/amber/cyan energy and vertical rhythm, plus *Loki* (TVA) **seal-like** HUD frames, mustard/stone discipline, and **monospace instrument** readouts. Keep **low-poly, few lights, no default post stack** on Quest.

**Out of scope:** HTML/CSS shell (see [shell-2d.md](./shell-2d.md)).

---

## Inspiration

**Fictional references** (*The Fifth Element*, *Loki*) are **mood guides only**—palette, layout energy, shape language—not IP, likenesses, or literal set recreations.

### Film / culture: *The Fifth Element* + *Loki* (TVA)

**XR environments + in-world chrome** (scene, props, TagAlong HUD, lab staging):

- **Fifth Element energy:** dense future-city **vertical rhythm** as *layout* inspiration—stacked bands, strong **orange / amber / cyan** accents, **neon rim reads** on interactive props, playful legibility at a glance (still low-poly and cheap materials).
- **Loki / TVA discipline:** **institutional** mustard, tan stone, and deep brown-red; **circular seal / stamp** motifs for HUD frames and mode badges; **monospace or narrow** type for “instrument” lines (FPS, logs); **brutalist** slabs and corridors translated into simple boxes and arches in the lab stages.

### Web / industry (performance & spatial craft)

- [Meta WebXR performance best practices](https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/) — reduce overdraw, avoid per-frame allocations/GC hot paths, validate on device.
- [MDN WebXR performance guide](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Performance) — balance quality, depth precision, materials, and scene complexity vs frame rate.
- **Spatial UI** — hierarchy uses depth, reach, and motion; avoid flat 2D UI pasted into 3D without comfortable placement and clear states.
- [Mozilla Hello WebXR — visual development](https://blog.mozvr.com/visualdev-hello-webxr/) — readable **simple materials**, **limited textures**, **art-directed color** over heavy shader stacks.

**Desktop shell mood** (*Her*-like) lives in **[shell-2d.md](./shell-2d.md)**. Execution plan: [spatial polish plan](../spatial-polish-plan.md).

---

## Principles

1. **Readable silhouettes** — props read at a glance; rim/emissive only where interaction demands it.
2. **Bold accents, dark void** — most of the frame is deep blue-violet void + floor; accents are intentional, not noisy.
3. **Institutional HUD** — circular or “seal” framing for persistent HUD; mono type for metrics/logs in XR.
4. **Vertical staging** — arrange lab sets in **bands** (foreground plinths, midground targets, background landmark) rather than flat scatter.
5. **Performance budget** — one skydome, one infinite grid, **≤ 2** meaningful lights affecting the scene; shadows only where justified.

---

## Default palette (semantic tokens)

Map these to the **`xr`** object in `playgroundTheme` and to `THREE.Color` / material props. Hex is the default **playground** preset.

### Environment

| Token | Default | Usage |
|-------|---------|--------|
| `xr.void.clear` | `#0B0614` | `scene.background` when no skydome (fallback) |
| `xr.skydome.top` | `#1a0b2e` | Skydome zenith |
| `xr.skydome.horizon` | `#3d1f0f` | Skydome horizon (warm Fifth Element band) |
| `xr.skydome.bottom` | `#120a18` | Lower hemisphere blend toward floor |
| `xr.fog.color` | `#120a18` | Fog color (match floor/near void) |
| `xr.fog.near` | `8` | World units; tune per scene scale |
| `xr.fog.far` | `35` | World units; keep subtle on Quest |
| `xr.floor.albedo` | `#1e1428` | Main floor plane |
| `xr.floor.emissive` | `#120818` | Very low emissive if any (optional) |
| `xr.grid.cell` | `#3d3550` | Infinite grid fine lines |
| `xr.grid.section` | `#f59e0b` | Section lines (amber, restrained opacity in implementation) |

### Lighting

| Token | Default | Usage |
|-------|---------|--------|
| `xr.light.key.color` | `#FFE8D2` | Key directional (warm) |
| `xr.light.key.intensity` | `1.0` | Tune with hemisphere |
| `xr.light.key.position` | `[5, 8, 5]` | World space |
| `xr.light.hemi.sky` | `#6B8CFF` | Cool sky fill (cyan-violet) |
| `xr.light.hemi.ground` | `#2A1810` | Warm bounce toward floor |
| `xr.light.hemi.intensity` | `0.35` | Keep subordinate to key |

**Policy:** Prefer **one directional + one hemisphere**. Avoid extra shadow-casting lights unless a lab explicitly needs them.

### Accents (props, gizmos, state)

| Token | Default | Usage |
|-------|---------|--------|
| `xr.accent.cyan` | `#22d3ee` | Ray hits, valid placement, locomotion path |
| `xr.accent.amber` | `#f59e0b` | Warnings, section emphasis, hover secondary |
| `xr.accent.orange` | `#ea580c` | Primary interactive highlight, grab |
| `xr.accent.mustard` | `#d97706` | TVA institutional trim, HUD ring |
| `xr.accent.stone` | `#a8a29e` | Brutalist slabs, neutral props |
| `xr.accent.seal` | `#78350f` | Deep brown-red for stamp/seal weight |

### HUD (in-headset, TagAlong)

| Token | Default | Usage |
|-------|---------|--------|
| `xr.hud.panelFill` | `#1c1917` | Panel background |
| `xr.hud.panelOpacity` | `0.82` | Alpha for translucent panel |
| `xr.hud.panelBorder` | `#d97706` | Outer “seal” stroke |
| `xr.hud.textPrimary` | `#e7e5e4` | Main HUD labels |
| `xr.hud.textMetric` | `#99f6e4` | FPS / timing (mint-cyan, instrument read) |
| `xr.hud.textMuted` | `#a8a29e` | Secondary log lines |

**Shape:** Rounded rect body + optional **outer circular** rim or corner arcs (low segment count: **≤ 32** segments per quarter if using curves).

### AR overlay

| Token | Default | Usage |
|-------|---------|--------|
| `xr.ar.stroke` | `#22d3ee` | Alignment ring / reticle |
| `xr.ar.opacity` | `0.35` | Line or additive surface |

---

## Materials

| Use case | Material | Notes |
|----------|----------|--------|
| Floor, large static masses | `MeshStandardMaterial` | `roughness` 0.85–1.0, `metalness` 0 |
| Interactive props default | `MeshStandardMaterial` | `roughness` 0.45–0.65 |
| “Neon rim” read | Same + low **`emissive`** | Emissive color = accent at **0.15–0.45** intensity; avoid bloom dependency |
| HUD panel | `MeshBasicMaterial` or unlit | Opaque or transparent; single-sided; no lighting needed |
| Skydome | `MeshBasicMaterial` | Vertex colors or single gradient map; **depthWrite: false** if layered |

**Rules**

- Do not multiply unique materials per instance without reason; **clone** from a small shared set when variants differ only by color.
- Prefer **color + emissive** over new textures for this playground.

---

## Typography (drei `Text` in XR)

| Role | `fontSize` (world units) | Color token | Notes |
|------|---------------------------|-------------|--------|
| Lab title | 0.12–0.15 | `text.muted` analog: `#a8a29e` | Humanist if available via `font` prop |
| HUD metric line | 0.032–0.040 | `hud.textMetric` | Treat as instrument |
| HUD log | 0.028–0.034 | `hud.textMuted` | Few lines; avoid updating mesh every frame if possible |

**Pitfalls:** Do not nest `<Text>` inside `<mesh>`. See [Pitfalls](../pitfalls.md).

---

## Layout vocabulary (labs)

| Element | Description | Accent |
|---------|-------------|--------|
| **Pedestal** | Short cylinder or rounded box, `stone` + `mustard` rim | Selection |
| **Backdrop arc** | Thin torus segment or extruded arc behind targets | `seal` / low emissive |
| **Path chevrons** | Flat instances along floor normal | `cyan` |
| **Landmark stack** | Simple brutalist column in far band | `stone` + `amber` window cuts |
| **Placement ring** | Thin torus on hit plane | `ar.stroke` / `cyan` |
| **Ghost preview** | Transparent `Standard` with low opacity + **emissive** rim `orange` | Placement |
| **Manipulable core** | Rounded box or icosphere | `orange` hover, `cyan` constraint OK |
| **Target gizmo** | Wireframe or thin boxes | `amber` + `cyan` corners |

---

## Per-lab accent routing (suggested)

| Lab id | Primary | Secondary | Notes |
|--------|---------|-----------|--------|
| `selection` | `orange` | `amber` | Clear hover vs selected (green success `#22c55e` may stay for selected if legible) |
| `placement` | `cyan` | `orange` | Valid vs invalid: pair cyan with `accent.seal` or desaturated red `#b91c1c` for invalid |
| `locomotion` | `cyan` | `amber` | Teleport valid surface |
| `manipulation` | `orange` | `mustard` | Docking target vs held object |

---

## Geometry & draw-call discipline

| Asset | Guideline |
|-------|-----------|
| Circles / cylinders | **≤ 24–32** radial segments unless large on screen |
| Spheres | **≤ 24** segments for props |
| Skydome | **≤ 24** width segments, **≤ 16** height rings |
| Rounded HUD panel | Prefer **12–16** corner segments if using `RoundedBox` |
| Text | Minimize count; batch labels; avoid per-frame string changes |

---

## Anti-patterns

- More than **two** real-time lights affecting most objects by default.
- Full-screen **post-processing** (bloom, SSAO) on Quest without an explicit off switch.
- **High-frequency emissive pulsing** on large surfaces.
- New `Vector3` / `Color` **per frame** in hot paths—read from theme once per preset change.

---

## Checklist (design QA in headset)

- [ ] Accents remain legible against skydome and fog.
- [ ] HUD panel readable in both bright and dim passthrough (AR) contexts if tested.
- [ ] Selected vs hovered states distinguishable without relying solely on color (scale/emissive/size).
- [ ] Frame time stable when toggling theme preset (no material storm per frame).
