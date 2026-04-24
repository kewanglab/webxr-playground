# Design handoff · implementation plan

**Status:** Phase 4 complete · Phase 5 next
**Working branch:** `claude/3d-handoff-spec` (single branch — spec + impl + living plan all live here)
**Spec snapshot tag:** `design-handoff-v0.2` → commit [`690e3a1`](https://github.com/kewanglab/webxr-playground/commit/690e3a1)
**Spec artifact:** [design-handoff/project/XR Themes Design.html](design-handoff/project/XR%20Themes%20Design.html) — open the Handoff tab
**Last updated:** 2026-04-23

Living document. Update the status column + progress log as each phase lands.

---

## Goal

Apply the v0.2 design handoff spec (tokens, materials, transitions, 8 intentional spatial overrides) to the runtime code. Cloud Park and Warm Night themes, all four labs. Keep Zen Garden manipulation mode as a parallel dropdown option — it's unchanged by this work.

## Branching strategy

**Single branch with a tag for the spec snapshot** (decided 2026-04-23, reversed from earlier two-branch plan).

- `claude/3d-handoff-spec` is the one working branch. Cherry-pick, all phases, plan updates, and progress log entries land here.
- The **tag `design-handoff-v0.2`** (at [`690e3a1`](https://github.com/kewanglab/webxr-playground/commit/690e3a1)) freezes the spec as-delivered. Diff against it at any point: `git diff design-handoff-v0.2 HEAD -- docs/design-handoff/`.
- No separate `claude/impl-design-spec` branch. That was earlier thinking — rejected because it forced a plan-doc sync dance between branches and bought only what a tag already gives us.

**Why this base:**
- Sits on top of `codex/cloud-park-captures` → both CP + WN theme foundations present in code.
- Inherits the scene kit + 3D model packs from `feature/xr-scene-enhancement`.
- The design handoff artifact lives in-repo at `docs/design-handoff/` → implementer opens the Handoff tab next to the code they're editing.

**Missing from this branch:** commit [`9aacc18`](https://github.com/kewanglab/webxr-playground/commit/9aacc18) "Polish XR selection and appearance controls" — authored on `feature/xr-scene-enhancement` after it forked from the cloud-park line. Touches `src/labs/cross-xr/SelectionLab.tsx`, `DockingMode.tsx`, `AppearanceSettingsDock.tsx`, `playgroundTheme.ts`, `XRRoot.tsx`, `TagAlongHUD.tsx`, `SensorPodObject.tsx`. These are the exact files the spec extends further. Must land **before** any spec work to avoid re-doing 180+ lines of existing polish.

## Phase 0 · Pre-impl setup ✅

- [x] Cherry-pick `9aacc18` onto `claude/3d-handoff-spec` (this working branch): `git cherry-pick 9aacc18` → landed as [`e07b1f8`](https://github.com/kewanglab/webxr-playground/commit/e07b1f8)
- [x] Conflicts resolved:
  - `src/app/store.ts` → merged both sides (kept `readInitialLabId` URL-param support from cloud-park + 9aacc18's `DEFAULT_ORIGIN_POSITION` reset on lab switch).
  - `src/labs/cross-xr/SelectionLab.tsx` → **skipped 9aacc18's changes to this file** (kept HEAD's cloud-park version). Reason: 7 conflict hunks between 9aacc18's `carpet`/`backdrop`/`faceUser`/`pierScale` polish and the cloud-park theme branching; Phase 2 rewrites this file per spec anyway.
- [x] Baseline verified at `http://localhost:50563/`: title "WebXR Playground", all 4 labs render (Selection · Placement · Locomotion · Manipulation), Enter VR/AR buttons present, 4 canvases alive, no runtime errors from cherry-picked code.
- [x] Handoff tab available at `/docs/design-handoff/project/XR%20Themes%20Design.html` for side-by-side reference.

## Phase 1 · Tokens foundation ✅

Added additively; existing callers untouched. Not wired into runtime visuals yet — Phase 2+ components will read these new tokens.

**What landed in [src/config/playgroundTheme.ts](../src/config/playgroundTheme.ts):**
- New types: `OrbStateColors`, `OrbTargetedState`, `OrbConfirmedState`, `OrbTheme`, `AffordanceTheme`, `GlowRecipe`, `GlowRecipes`
- Required fields added to `XrTheme`: `orb`, `affordance`, `glow`
- CP preset (`cloudParkXr`) populated with Cloud Park values from `TOKENS_JSON['cloud-park']`
- WN preset (`defaultXr`) populated with Warm Night values from `TOKENS_JSON['warm-night']`
  - Note: code's dark preset is still `id: 'default'` / label "Patina Instrument Lab" — didn't rename. Values match the spec's "warm-night" palette.
- New top-level exports: `TYPOGRAPHY` (DM Sans/Mono, scale, weights), `HUD_DIMS` (pill + panel dimensions)

**Checks:**
- [x] Existing callers still compile (`tsc --noEmit` clean)
- [x] No visual regression — app loads at `http://localhost:50563/`, all 4 labs render, no new console errors
- [x] Values copied verbatim from `TOKENS_JSON` in the Handoff tab (no re-typing)

## Phase 2 · Selection Lab ✅

Replaced themed per-variant tokens (kite/cylinder/capsule on pedestals) with spec-aligned tri-state spheres + small affordance glyphs. Scenery (stage, piers) untouched — Phase 6.

**What landed:**
- New `selectionTargetPositions` const in [src/config/labs.ts](../src/config/labs.ts) — ray (0, 1.60, −2.20), pinch (−0.30, 1.35, −0.55), touch (+0.30, 1.35, −0.55).
- New `StateOrb` component in [src/labs/cross-xr/SelectionLab.tsx](../src/labs/cross-xr/SelectionLab.tsx):
  - Sphere geometry, diameter = code `targetSize` (0.28 m default, Leva 0.1–1.0 m unchanged).
  - State machine: `idle` → `targeted` on pointer enter → `confirmed` on pointer down → auto-revert to `idle` after ~2 s.
  - Materials pull from new `xr.orb.{idle,targeted,confirmed}` tokens (Phase 1).
  - Targeted state: two concentric rings at visual r+25 mm / r+45 mm, pulsing at 1.2 Hz (sine, amp ±15% opacity). Emissive pulse 1.6 ↔ 1.9.
  - Confirmed state: ring collapse 180 ms + radial halo expand to r×2 over 220 ms + scale pulse 1 → 1.08 → 1 over 220 ms; halo holds 1.4 s then fades 400 ms.
  - Haptic + audio confirm hooks preserved.
- New `AffordanceGlyph` component renders small 3D hints (chevron-stack for ray, caliper arrows for pinch, flat ring for touch), tinted from `xr.affordance.*` tokens.
- Removed: `SelectableTarget`, `SelectionToken`, `CloudParkSelectionToken` — replaced by the two new components. Scenery (`SelectionStage`, `SelectionBackdropPiers`) kept as-is.

**Dropped imports:** `CloudParkPerch`, `useKitModel`, `XR_KIT_NATIVE`, `scalePlatformRoundForTargetCube` (pedestals no longer rendered — orbs float at spec positions).

**Checks:**
- [x] Leva tunables still work — `targetSize`, `confirmScaleBoost`, `enableHaptics`, `enableAudio` all present.
- [x] `pointerEventsType` allow-list preserved per variant (ray / touch / grab).
- [x] `tsc --noEmit` clean; app loads at `http://localhost:50563/` without new console errors.
- [ ] Pulse rate matches 1.2 Hz on the headset (deferred to Phase 8 headset test).
- [ ] CP ring uses alpha only, no shadow blur; WN uses ember glow blur 12 (WN glow is wired via ringGlow token; full visual verification deferred to Phase 8).

## Phase 3 · Placement Lab ✅

Replaced themed `SensorPodObject` / `CloudParkBeaconObject` with a single `CrystalPrism` component (octahedron-based diamond prism, h=`objectSize`, w=`objectSize*0.5`). Swapped floor ring + inner circle reticle for source-conditional aim affordances: warm reticle for controller aim, cool halo for pinch aim.

**What landed in [src/labs/ar/PlacementLab.tsx](../src/labs/ar/PlacementLab.tsx):**
- New `CrystalPrism({variant: 'solid' | 'ghost'})` component:
  - Solid: standard material w/ emissive (warm gold CP / amber WN from `labAccents.placement.primary`), vertical highlight seam.
  - Ghost: soft halo glow + translucent fill + wireframe outline, all cool-tinted from `xr.affordance.dockActive`. Leva `previewOpacity` wired through as `ghostAlpha` and modulates the three layers.
- New `SurfaceReticle`: flat ellipse ring + crosshair on the surface anchor, tinted from `xr.affordance.controllerRay` (warm). Only rendered when active source is `controller`.
- New `PinchHalo`: flat ellipse ring above the ghost at ~fingertip height + short vertical drop-line, tinted from `xr.affordance.dockActive` (cool). Only rendered when active source is `hand`.
- `PlacedArtifact` simplified — now just a `<CrystalPrism variant="solid">`. Theme-specific scenery (FloatingCloudMat, CloudParkBeaconObject, shadow blob, wind lines) removed from placement visuals.
- `PlacementShowcase` (formerly `CloudParkPlacementShowcase`): simplified desktop preview showing a solid + ghost crystal side-by-side with a "Enter AR to place" label. Theme-agnostic now.

**Removed imports:** `SensorPodObject`, `CloudParkBeaconObject`, `FloatingCloudMat`, `CloudParkShadowBlob`, `CloudParkWindLine`.

**Checks:**
- [x] Hit-test still anchors to detected floor (XRHitTest logic untouched).
- [x] Ghost follows the active source; `onSelectStart` places on pinch / trigger.
- [x] Controller reticle vs pinch halo — mutually exclusive, source-conditional render.
- [x] `tsc --noEmit` clean; app loads without new runtime errors.
- [ ] Visual verification (spec alignment of materials, dashed-feel of outline, halo height) deferred to Phase 8 headset test — drei `<Text>` + canvas content isn't introspectable from the browser DOM.

**Notes / small debts:**
- Ghost wireframe approximates the spec's "hatched 45° + dashed outline" — true dashed-line rendering would need a custom shader or `Line2` geometry. Callout for Phase 8 if it doesn't read as dashed enough on device.
- Pinch halo height uses `objectSize * 1.5` as a proxy for "fingertip above surface" since we don't track the actual fingertip mesh separately — close-enough for the ghost's anchor-bound render scope.

## Phase 4 · Manipulation Lab (Docking mode only) ✅

Docking mode grabbed-object and target-ghost are now key crystals per spec. Zen Garden mode untouched — `ZenGardenMode.tsx` and related files were not edited. `useManipulation.ts` also untouched — snap logic lives in `DockingMode.tsx`'s `onRelease`.

**What landed:**
- New fields in [src/config/labs.ts](../src/config/labs.ts) `docking`:
  - `snapToleranceM: 0.04` · `snapToleranceDeg: 10` (new — spec Section 04)
  - `translationOffsetM: 0.3` · `rotationOffsetDeg: 45` (unchanged — these are trial *target offsets*, not tolerances; spec conflated them, keeping the meaningful trial distances)
- New `KeyCrystal` component in [DockingMode.tsx](../src/labs/cross-xr/manipulation/DockingMode.tsx):
  - Shaft (box) + notched pentagonal head (extruded `Shape`) + UP indicator (dot for solid, arrow for ghost).
  - Height = `objectSize` (code default 0.125 m, Leva range unchanged).
  - Solid: standard material with emissive, accent-tinted head per `labAccents.manipulation.{primary,secondary}`.
  - Ghost: wireframe outlines + UP arrow (cone + stem), tinted from `xr.affordance.dockActive`.
- New `ProximityRing` component: radius = `grabDistance * 2` (tied to the actual grab threshold, so the visual boundary matches the game mechanic — ≈ 0.16 m at default `grabDistance = 0.08`). Built from 20 short vertical cylinder posts (4 cm tall) so the ring stays visible from any horizontal viewing angle; material opacity pulses at 1.2 Hz (0.45 ↔ 0.85) to read as an invitation, not a static decal. Visible only when the tracked hand is within `grabDistance * 2` of the object AND not actively manipulating.
- Snap-on-release logic in `onRelease`: when `positionalOffset ≤ snapToleranceM` AND `rotationalOffsetDeg ≤ snapToleranceDeg`, the object pose is forced to the target, result recorded with zero offsets, 30 ms haptic success burst fires on the right controller.

**Dropped imports in DockingMode.tsx:** `CloudParkBeaconObject`, `SensorPodObject`. Both now orphaned in the codebase after Phase 3 + 4 — cleanup in a follow-up commit.

**Checks:**
- [x] Zen Garden mode unaffected — `ZenGardenMode.tsx` and `useManipulation.ts` not edited.
- [x] `tsc --noEmit` clean; app loads; no new console errors.
- [ ] Tight snap tolerance doesn't feel punishing — headset playtest required (Phase 8).
- [ ] Ghost UP arrow orientation changes with target pose — visible in-headset only (Phase 8).

**Notes / small debts:**
- Snap motion is instant (no animation). Spec calls for 240 ms ease-out-back lerp; implementing that cleanly requires exposing the `ManipulableObject`'s group ref for animation, which is out of scope for Phase 4. Callout for Phase 8.
- Proximity ring approximated with 20 short vertical cylinder posts rather than a true dashed shader line — reads as dashed pickets from above, visible vertical ticks from any side angle. Revisit if the pattern doesn't feel dashed enough on device.
- Spec's "0.24 m radius" value for the proximity ring (from design-handoff v0.2 Section 04) was a too-literal translation from the mock's pixel dimensions. Replaced with `grabDistance * 2` so the ring scales with the Leva-tunable grab zone; matches the mock's visual proportion (~1.5× the key's half-height) at default sizes.

## Phase 5 · Locomotion Lab (concept change)

**Largest conceptual shift.** Current code has 3 static "comfort target" rings. Spec reframes the lab as a multi-step teleport demo.

**Target files:**
- [src/labs/vr/LocomotionLab.tsx](../src/labs/vr/LocomotionLab.tsx)

**Spec changes:**

| Aspect | Current code | Target |
|---|---|---|
| Lab concept | 3 static rings at fixed positions | 3 numbered waypoints → flagged destination, linked by dashed teleport arcs |
| Waypoint visuals | single ring, no number | 3 stacked oval rings + central disc + step numeral (DM Mono bold) |
| Destination | n/a | flag pole + pennant above disc, green additive bloom (WN only) |
| Arc visualization | framework default | dashed quadratic curve connecting origin → w1 → w2 → destination |
| Snap turn | **keep at 45°** (unchanged) | 45° (spec mock showed 50° but we're overriding the override; code default wins) |
| Comfort vignette | optional | 40 ms fade in/out on snap turn |

**Note:** The "keep 45°" decision (from the design review) overrides the 50° value in the design mockup. Handoff Section 04 lists this under "Explicitly unchanged from code."

**Checks:**
- [ ] Teleport to each numbered waypoint individually
- [ ] Arc lines render without z-fighting
- [ ] Destination flag is visually distinct from step waypoints

## Phase 6 · Scenery (arch + stage island)

Shared across all VR labs. Biggest new content.

**Target files:**
- [src/xr/visual/CloudParkScenery.tsx](../src/xr/visual/CloudParkScenery.tsx) — extend for arch + island
- New: `src/xr/visual/WarmNightScenery.tsx` — parallel component for WN theme
- [src/xr/scene/VRScene.tsx](../src/xr/scene/VRScene.tsx) — wire into shared scene

**Spec changes:**

| Aspect | Target |
|---|---|
| Arch | 2.4 m wide × 1.6 m tall, centered at origin, base y=0 |
| Stage island / platform | 1.6 × 0.35 m oval at origin, y=0 |
| CP arch material | stone `#FFF5DA`, rim `rgba(255,209,102,.88)`, no shadow |
| WN arch material | stone `#62504A`, rim `rgba(200,95,88,.8)`, ember shadow blur 18 alpha 0.5 |
| CP island material | top grad `#FFFAEC → #C9A86C`, side grad `#C9A86C → #6B4C28`, gold scatter dots |
| WN platform material | top grad `#6E6058 → #4A3C34`, side grad `#3E3028 → #1E1610`, grid rings + ember rim |

**Checks:**
- [ ] Scenery doesn't occlude lab targets
- [ ] FPS on Quest 3 stays in budget (90 fps VR)
- [ ] Scenery switches with theme toggle
- [ ] Arch doesn't intersect controllers when player stands near origin

## Phase 7 · HUD refresh

**Target files:**
- [src/xr/hud/HUDPanel.tsx](../src/xr/hud/HUDPanel.tsx)
- [src/xr/hud/HUDButton.tsx](../src/xr/hud/HUDButton.tsx)
- [src/xr/hud/InXRStats.tsx](../src/xr/hud/InXRStats.tsx)
- [src/xr/hud/TagAlongHUD.tsx](../src/xr/hud/TagAlongHUD.tsx)

**Spec changes:**

| Aspect | Target |
|---|---|
| Minimized pill | 158 × 38 px, radius 19, FPS + trial counter + expand arrow |
| Expanded panel | 295+ px wide, radius 13, FPS large, 4-metric strip (Target · Boost · Haptics · Audio), method label footer |
| CP border | `rgba(255,209,102,.88)`, shadow blur 7 |
| WN border | `rgba(200,95,88,.84)`, shadow blur 7, ember underglow |

**Checks:**
- [ ] Both minimized and expanded states render
- [ ] Tap to expand / collapse works on hand + controller
- [ ] Text legible against bright AR passthrough

## Phase 8 · Verify against spec

- [ ] Open the Handoff tab + the running dev server side-by-side. Walk through each section:
  - Tokens: colors match swatches
  - Materials: state colors + ring behavior match
  - Transitions: time pulse rate, measure snap choreography
  - Section 04: verify the 8 spatial deltas are all applied
- [ ] Headset test (Quest 3): fps, ergonomics, theme switch
- [ ] Regression: all existing Leva tunables still work
- [ ] Capture screenshots: run `npm run capture:screenshots` — diff against pre-impl baseline captures

## Reference map (spec section → code location)

| Handoff section | Code |
|---|---|
| 01 Tokens | [src/config/playgroundTheme.ts](../src/config/playgroundTheme.ts) |
| 02 Materials | per-lab components in [src/labs/](../src/labs/) + [src/xr/visual/](../src/xr/visual/) |
| 03 Transitions | per-lab hooks + [useManipulation.ts](../src/labs/cross-xr/manipulation/useManipulation.ts) |
| 04 Spatial changes | [src/config/labs.ts](../src/config/labs.ts) presets + lab components |
| 05 Engine notes | guidance — no single file |
| 06 Full JSON | consumable shape for theme-registry import |

## Open questions (update as decided)

- [ ] What's the final FPS budget strategy when both arch + stage scenery render in VR? Keep a scenery toggle for fallback?
- [ ] Does the WN ember-bloom pass need a real post-process, or can emissive + additive blending fake it at Quest cost?
- [ ] Should the "dock snap tolerance" (0.04 m + 10°) be exposed as a Leva tunable so we can playtest feel on-device, or locked per spec?
- [ ] Multi-step teleport Locomotion: do we retain the old "comfort target" mode behind a toggle, or fully replace it?

## Snapshots

Tags mark frozen reference points. Diff any of them against `HEAD` to see what has changed since.

| Tag | Commit | What it freezes |
|---|---|---|
| `design-handoff-v0.2` | [`690e3a1`](https://github.com/kewanglab/webxr-playground/commit/690e3a1) | Spec as delivered to engineering: tokens, materials, transitions, 8 spatial overrides |

Add future tags here as milestones land (e.g. `impl-phase-2-selection`, `impl-complete-v1`).

## Progress log

| Date | Phase | Commit | Notes |
|---|---|---|---|
| 2026-04-23 | — | [`690e3a1`](https://github.com/kewanglab/webxr-playground/commit/690e3a1) | Spec v0.2 committed. Tagged `design-handoff-v0.2`. |
| 2026-04-23 | — | [`4a91f36`](https://github.com/kewanglab/webxr-playground/commit/4a91f36) | Plan authored. |
| 2026-04-23 | — | [`89b8b4a`](https://github.com/kewanglab/webxr-playground/commit/89b8b4a) | Switched from two-branch to single-branch + tag strategy. Plan Phase 0 wording corrected. |
| 2026-04-23 | 0 | [`e07b1f8`](https://github.com/kewanglab/webxr-playground/commit/e07b1f8) | Phase 0 complete. Cherry-picked `9aacc18` with SelectionLab.tsx skipped (7 conflicts deferred to Phase 2 rewrite). Baseline app verified green. |
| 2026-04-23 | 1 | [`9b91dbd`](https://github.com/kewanglab/webxr-playground/commit/9b91dbd) | Phase 1 complete. Added `orb` / `affordance` / `glow` fields to `XrTheme` (both presets populated) + top-level `TYPOGRAPHY` / `HUD_DIMS` exports. No existing callers touched. |
| 2026-04-23 | 2 | [`46e9677`](https://github.com/kewanglab/webxr-playground/commit/46e9677) | Phase 2 complete. Selection Lab targets: cubes → tri-state spheres (`idle`/`targeted`/`confirmed`). New `StateOrb` + `AffordanceGlyph` components; positions from new `selectionTargetPositions` const. 1.2 Hz pulse, halo-expand choreography, auto-revert. Scenery kept. |
| 2026-04-24 | 3 | [`724a0b0`](https://github.com/kewanglab/webxr-playground/commit/724a0b0) | Phase 3 complete. Placement Lab crystals: themed pods → `CrystalPrism` (octahedron-based diamond prism, h=`objectSize`, w=`objectSize*0.5`). New `SurfaceReticle` (controller) + `PinchHalo` (hand) source-conditional affordances; ghost wireframe approximates hatched/dashed feel. Desktop showcase simplified to solid+ghost preview pair. |
| 2026-04-24 | 4 | (this commit) | Phase 4 complete. Manipulation · Docking grabbed-object + ghost: themed pods → `KeyCrystal` (shaft + notched pentagonal head + UP indicator). New `ProximityRing` (hand-proximity hint). New `snapToleranceM` / `snapToleranceDeg` fields (0.04 m + 10°) with auto-snap on release + 30 ms haptic success burst. Zen Garden mode unaffected. |
