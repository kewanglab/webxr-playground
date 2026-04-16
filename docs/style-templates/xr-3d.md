# Style template: XR (3D scene & objects)

**Intent:** **Warm restrained night**. The shell is coral red, dusty salmon, muted blue, cream, off-white, and walnut; XR should feel like that same OS identity translated into a quiet nighttime space. Keep the world nocturnal and intimate, but avoid neon-futuristic spectacle. Use low visual noise, flat readable forms, soft grouping, warm materials, and restrained screen graphics. Keep **low-poly, few lights, no default post stack** on Quest.

**Out of scope:** HTML/CSS shell (see [shell-2d.md](./shell-2d.md)).

---

## Inspiration

Use references as mood only, never as literal set recreation.

- **Warm domestic night:** hush, intimacy, nostalgia, cream light, walnut furniture, muted screen glow
- **Soft ceremonial staging:** plinths, arches, trays, and stations that feel prepared for interaction instead of debug geometry in void
- **Understated OS identity:** screen graphics stay quiet, flat, legible, and restrained rather than neon-futuristic

The 2D shell in [shell-2d.md](./shell-2d.md) is the emotional source. XR should feel like stepping into that same product after sunset.

---

## Principles

1. **Night, not darkness** — the world should read as evening, never as an empty black stage.
2. **Fixed palette family** — coral red, dusty salmon, muted blue, cream, off-white, walnut.
3. **Screen glow over neon edge** — emissive should feel like a quiet display or domestic lamp, never gamer lighting.
4. **Readable silhouettes** — hero objects remain the clearest forms in the scene.
5. **Roomy, low-ceremony composition** — foreground station, midground task, background landmark, with breathing room.
6. **Performance discipline** — one skydome, one grid, one directional plus one hemisphere by default.

---

## Default palette (semantic tokens)

Map these to the **`xr`** object in `playgroundTheme`.

### Environment

| Token | Default | Usage |
|-------|---------|--------|
| `xr.void.clear` | `#1C1B1D` | Scene fallback background |
| `xr.skydome.top` | `#28313A` | Walnut night with muted blue lift |
| `xr.skydome.horizon` | `#866560` | Dusty salmon / walnut horizon band |
| `xr.skydome.bottom` | `#231F1D` | Lower walnut atmosphere |
| `xr.fog.color` | `#282321` | Night air / depth haze |
| `xr.fog.near` | `7` | Start haze a little closer than before |
| `xr.fog.far` | `32` | Keep depth gentle and intimate |
| `xr.floor.albedo` | `#403A36` | Soft walnut clay / domestic floor |
| `xr.floor.emissive` | `#292522` | Very low warm lift only |
| `xr.grid.cell` | `#706862` | Subtle thin rules |
| `xr.grid.section` | `#D7AEA8` | Dusty salmon section read |

### Lighting

| Token | Default | Usage |
|-------|---------|--------|
| `xr.light.key.color` | `#FFE8D6` | Cream key light |
| `xr.light.key.intensity` | `1.08` | Primary scene light |
| `xr.light.key.position` | `[4.5, 7.5, 5.5]` | Front-side elevated key |
| `xr.light.hemi.sky` | `#8298A0` | Muted blue ambient sky |
| `xr.light.hemi.ground` | `#4A3A34` | Walnut ground bounce |
| `xr.light.hemi.intensity` | `0.56` | Enough fill to avoid dead black |

### Accents

| Token | Default | Usage |
|-------|---------|--------|
| `xr.accent.cyan` | `#829AA2` | Reserved muted blue system/valid state |
| `xr.accent.amber` | `#DDB2AB` | Dusty salmon emphasis and secondary trim |
| `xr.accent.orange` | `#C85F58` | Primary coral red interaction |
| `xr.accent.mustard` | `#9A7A68` | Soft walnut trim / restrained hardware |
| `xr.accent.stone` | `#DED2C3` | Cream-taupe props and slabs |
| `xr.accent.seal` | `#62504A` | Walnut structural weight |

### HUD

| Token | Default | Usage |
|-------|---------|--------|
| `xr.hud.panelFill` | `#51443E` | Walnut glass panel base |
| `xr.hud.panelOpacity` | `0.70` | Translucent but not muddy |
| `xr.hud.panelBorder` | `#C85F58` | Coral red hairline |
| `xr.hud.textPrimary` | `#FFF5EA` | Cream main text |
| `xr.hud.textMetric` | `#B4C7CC` | Muted blue system metric tint |
| `xr.hud.textMuted` | `#E5C9C0` | Dusty salmon secondary labels |

### AR overlay

| Token | Default | Usage |
|-------|---------|--------|
| `xr.ar.stroke` | `#829AA2` | Valid placement / alignment stroke |
| `xr.ar.opacity` | `0.42` | Slightly clearer in passthrough |

---

## Materials

| Use case | Material | Notes |
|----------|----------|--------|
| Floor, plinths, slabs | `MeshStandardMaterial` | `roughness` 0.82–0.98, `metalness` 0 |
| Crafted props | `MeshStandardMaterial` | Warm neutrals, coral, dusty salmon, walnut details |
| Quiet screen accents | Same + low `emissive` | Use coral red, dusty salmon, muted blue, or cream sparingly |
| Reserved valid state | Same + muted blue `emissive` | Use only when validity or readiness truly benefits |
| HUD panel | `MeshBasicMaterial` | Warm translucent walnut glass / off-white plate |
| Skydome | `MeshBasicMaterial` | Gradient only; no complex shading |

**Rules**

- Prefer **color, silhouette, and emissive restraint** over flashy shader behavior.
- Large surfaces should stay mid-value and warm, not near-black.
- Do not turn every interactive thing into a glowing gadget.

---

## Typography (drei `Text` in XR)

| Role | `fontSize` (world units) | Color token | Notes |
|------|---------------------------|-------------|--------|
| Lab title | 0.12–0.15 | `hud.textPrimary` | Gentle but readable |
| Lab subtitle | 0.055–0.07 | `hud.textMuted` | Supporting line only |
| HUD metric | 0.032–0.040 | `hud.textMetric` | Use reserved cool note sparingly |
| HUD log / helper | 0.024–0.034 | `hud.textMuted` | Keep copy short |

---

## Layout vocabulary (labs)

| Element | Description | Color direction |
|---------|-------------|-----------------|
| **Pedestal** | Warm stone cylinder or rounded box | Cream-taupe + dusty salmon rim |
| **Backdrop arc** | Soft arch, halo, or seal band behind the task | Walnut / coral red |
| **Path cues** | Floor chevrons or landing rings | Muted blue first, dusty salmon secondary |
| **Landmark** | Far-band column, arch, or light stack | Cream-taupe + walnut cuts |
| **Placement ring** | Thin world-space ring | Muted blue only when validating |
| **Ghost preview** | Transparent warm material with gentle coral or muted blue edge | No neon |
| **Manipulable core** | Crafted tool, pod, tray object, or artifact | Coral red + cream-taupe + walnut |
| **Target gizmo** | Thin corners, outline boxes, or ghost silhouette | Dusty salmon + coral red, muted blue only if needed |

---

## Per-lab accent routing

| Lab id | Primary | Secondary | Notes |
|--------|---------|-----------|--------|
| `selection` | `orange` | `amber` | Coral red + dusty salmon comparison stations |
| `placement` | `cyan` | `orange` | Muted blue reserved for valid placement |
| `locomotion` | `cyan` | `amber` | Muted blue route, dusty salmon support |
| `manipulation` | `orange` | `mustard` | Coral hero object, walnut precision trim |

**Zen Garden:** same family, softer. More walnut wood, cream moonlit sand, dusty salmon blossom warmth, and only a tiny muted-blue note in crystal or validity if needed.

---

## Geometry & draw-call discipline

| Asset | Guideline |
|-------|-----------|
| Circles / cylinders | **≤ 24–32** radial segments |
| Spheres | **≤ 24** segments for props |
| Skydome | **≤ 24** width, **≤ 16** height |
| HUD curves / rims | Keep segment counts low and reused |
| Text | Minimize count; avoid per-frame string churn |

---

## Anti-patterns

- Black-violet void swallowing the whole lab
- Bright cyan or neon blue used as a decorative accent
- Neon edge-lighting on every interactable
- Cold gray HUD plates that feel unrelated to the shell
- Overly dark floors or brutalist masses that make scenes feel hostile
- Busy iconography or “futuristic” decoration that adds noise without meaning
- Per-frame material or color allocation in hot paths

---

## Checklist (design QA in headset)

- [ ] Scene reads as night, but not gloomy
- [ ] Shell and XR feel like the same product family
- [ ] Coral red, dusty salmon, muted blue, cream, off-white, and walnut are the only visible identity colors
- [ ] Muted blue appears only where meaningfully useful
- [ ] HUD remains readable and calmer than before
- [ ] Zen Garden still feels tranquil and special, but no longer detached from the shared theme
- [ ] Theme toggle/preset changes do not cause material churn or frame instability
