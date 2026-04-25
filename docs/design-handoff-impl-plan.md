# Design handoff · implementation plan

**Status:** Phase 7 complete · Phase 8 next
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
- New `ProximityRing` component: single flat ring on the XZ plane (Phase 2 selection-ring style), radius = `objectSize * 0.75` (≈ 0.094 m at default — slim margin around the key, noticeably tighter than earlier iterations). Opacity pulses at 1.2 Hz (0.35 ↔ 0.75), matching the Phase 2 targeted-ring cadence for design-system coherence. Visible only when the tracked hand is within `grabDistance * 2` of the object AND not actively manipulating.
- Snap-on-release logic in `onRelease`: when `positionalOffset ≤ snapToleranceM` AND `rotationalOffsetDeg ≤ snapToleranceDeg`, the object pose is forced to the target, result recorded with zero offsets, 30 ms haptic success burst fires on the right controller.

**Dropped imports in DockingMode.tsx:** `CloudParkBeaconObject`, `SensorPodObject`. Both now orphaned in the codebase after Phase 3 + 4 — cleanup in a follow-up commit.

**Checks:**
- [x] Zen Garden mode unaffected — `ZenGardenMode.tsx` and `useManipulation.ts` not edited.
- [x] `tsc --noEmit` clean; app loads; no new console errors.
- [ ] Tight snap tolerance doesn't feel punishing — headset playtest required (Phase 8).
- [ ] Ghost UP arrow orientation changes with target pose — visible in-headset only (Phase 8).

**Notes / small debts:**
- Snap motion is instant (no animation). Spec calls for 240 ms ease-out-back lerp; implementing that cleanly requires exposing the `ManipulableObject`'s group ref for animation, which is out of scope for Phase 4. Callout for Phase 8.
- Proximity ring sizing iterated down from the spec's literal 0.24 m (which was a too-literal translation of mock pixel dimensions) to `objectSize * 0.75`. Visual language unified with Phase 2 selection rings — flat, thin, pulsing — instead of the earlier vertical-picket prototype. Flat ring becomes a thin line when viewed edge-on; accepted tradeoff for Phase 2 consistency, re-examinable at Phase 8 if headset testing surfaces an issue.

## Phase 5 · Locomotion Lab (concept change) ✅

Reframed from 3 static comfort rings to a numbered teleport sequence (1 → 2 → 3-as-destination) with dashed arcs. Movement / turn / teleport machinery untouched — waypoints and arcs are pure visualization; the `TeleportTarget` still covers the whole floor plane so users can teleport anywhere.

**What landed in [src/labs/vr/LocomotionLab.tsx](../src/labs/vr/LocomotionLab.tsx):**
- New `NumberedWaypoint` component: 3 stacked flat rings + central disc + a floating drei `<Text>` numeral (steps 1, 2) or a `DestinationFlag` (step 3). Step tint from `labAccents.locomotion.primary`; destination tint from `xr.orb.confirmed.base` (green/teal — matches the Phase 2 confirmed state visual language). WN theme adds an additive-blended bloom halo under the destination (`xr.orb.confirmed.halo`); CP omits the bloom to stay painterly-daytime.
- New `DestinationFlag` subcomponent: vertical cylinder pole + triangular pennant built from a `Shape` + `shapeGeometry` (DoubleSide so it reads from any angle).
- New `quadArcPoints` helper: samples a quadratic Bézier from A to B with a configurable peak height (currently 0.55 m). Feeds into drei `<Line>` with `dashed dashSize={0.12} gapSize={0.09}`.
- Dashed arcs drawn origin → W1 → W2 → W3 (three arcs total). First arc starts at `(0, 0.08, 0.3)` to avoid colliding with the StartZone ring.
- Removed: the inline `markers` block (the 3 static amber comfort rings).

**What stayed:**
- Thumbstick movement + snap / smooth turn logic (snap-turn already at 45° default per `tuningPresets`; spec's "keep 45°" decision honored — spec mock's 50° was the override, explicitly rolled back during design review).
- Scenery: `StartZone`, `PathChevron`s, `DestinationPortal` (now theatrical backdrop beyond waypoint 3), `CloudParkLocomotionScenery`, warm-theme walls + spires, terminal column / island at z=-15.8.
- `TeleportTarget` invisible floor box.

**Checks:**
- [x] `tsc --noEmit` clean; app loads; no new console errors.
- [x] Snap turn preserved at 45° (per design review override).
- [ ] Teleport to each numbered waypoint individually — requires headset (Phase 8).
- [ ] Arc lines render without z-fighting — arcs sit at y=0.08 above the floor plane (y=0), should be safe; verify in-headset (Phase 8).
- [ ] Destination flag reads distinctly from step waypoints — flag + green tint + optional WN bloom should be enough; verify in-headset.

**Notes / small debts:**
- Comfort vignette on snap turn (spec: 40 ms fade in/out) not implemented — needs a camera-attached overlay quad with its own animation timeline. Out of scope for Phase 5; noted for Phase 8.
- Text numerals use drei `<Text>` default font (system fallback); spec calls for DM Mono bold. Loading the font via the `<Text>` `font` prop (with a URL) is a Phase 8 polish item.
- `DestinationPortal` archway at z=-12.2 remains as scenery behind waypoint 3; in the spec it didn't exist as a separate element. Kept for visual continuity with the existing lab; re-evaluate in Phase 8 if it feels redundant with the flag.

## Phase 6 · Scenery (arch + stage island) ✅

Net-new shared scenery per spec Section 04 — framing present across all VR labs. Wired into `VRScene` at origin behind a `showSharedScenery` Leva toggle (default on). Existing per-lab scenery (Selection pier, Locomotion StartZone, Manipulation docking table) left in place — the two layers coexist.

**What landed:**
- New file [src/xr/visual/SharedScenery.tsx](../src/xr/visual/SharedScenery.tsx) exporting two components:
  - `SharedArch` — half-torus crown (major radius 1.2 m) on two box legs (0.4 m tall). Spec dimensions 2.4 × 1.6 m. Theme switch:
    - **CP**: warm stone `#FFF5DA` + amber rim `#FFD166` at low emissive (0.04), flat daytime look.
    - **WN**: dark stone `#62504A` + ember rim `#C85F58` at higher emissive (0.22), plus an additive-blended halo torus at 1.04× radius approximating the spec's "shadow blur 18." True bloom would need a post-process pass (Phase 8 polish).
  - `StagePlatform` — oval-scaled cylinder (1.6 m × 0.35 m footprint, 4 cm thick). Theme switch:
    - **CP**: warm-gold top `#F0DC9E` + scatter gold dots + subtle rim stripe.
    - **WN**: dark top `#5E5248` + ember-alpha rim + additive underglow ring.
  - Low 4 cm profile to avoid physical/virtual floor mismatch when the user stands at origin.
- [src/xr/scene/VRScene.tsx](../src/xr/scene/VRScene.tsx) wiring: `<SharedArch position={[0,0,0]} />` + `<StagePlatform position={[0,0,0]} />` under a new `showSharedScenery` Leva toggle in the Debug folder (default `true`).

**Checks:**
- [x] `tsc --noEmit` clean; app loads without new runtime errors.
- [x] Theme switches correctly (CP vs WN materials differ at the component level).
- [ ] Arch doesn't intersect controllers / lab targets at origin — requires headset (Phase 8).
- [ ] FPS budget on Quest 3 — new geometry is minimal (~6 meshes across arch + platform) so headroom should be fine; verify (Phase 8).

**Notes / debts (default toggled OFF; revisit in Phase 8):**

- **Visual quality below bar.** First-pass `SharedArch` reads as less sophisticated than the existing per-lab arches (Selection's CloudParkArch + piers, Locomotion's DestinationPortal). The half-torus + box-leg primitive is too plain — needs material polish, possibly a CatmullRom-curved profile, base molding, capital details. Default `showSharedScenery = false` until reworked.
- **Position is off.** Currently both at origin (0, 0, 0); the user stands inside the arch. Spec said "centered at origin" but on device the arch should likely sit further forward (e.g., z ≈ -2 to -2.5) so the user enters the framed scene rather than starting inside it. Same for the platform — needs a position pass.
- **Redundancy with per-lab scenery.** Existing labs already have stage-like elements (Selection's circular carpet + piers at z≈-1.48, Locomotion's StartZone ring at z=+0.6, Manipulation's docking table at z=-0.7). On-device evaluation needed to decide whether to remove per-lab scenery in favor of the shared stage. The Leva toggle `showSharedScenery` lets us flip between modes for comparison once the shared scenery is good enough.
- **WN ember glow is faked** with an additive halo torus + emissive material. Spec's "shadow blur 18" implies a real bloom pass.
- **CP platform "grad `#FFFAEC → #C9A86C`" from spec** simplified to a single emissive-tinted warm gold (`#F0DC9E`). Vertex-color gradients across the platform would require a shader or baked texture.
- **WN platform "grid rings" on top** not yet drawn — shown only via the underglow ring. Add a set of concentric emissive rings.

## Phase 7 · HUD refresh ✅

Refactored `HUDPanel` from a single FPS card into a self-contained tap-to-expand widget. Two visual states matching design-handoff v0.2 HUD_DIMS, with theme-correct rounded-rect borders. `InXRStats.tsx` deleted (FPS logic folded into `HUDPanel` as a `useFpsLabel` hook). `TagAlongHUD` and `HUDButton` left untouched.

**What landed in [src/xr/hud/HUDPanel.tsx](../src/xr/hud/HUDPanel.tsx):**
- Spec px → world meters via `PX = 0.00125 m/px`. Minimized pill: 158×38 px → 0.198 × 0.048 m, radius 19 px → 0.024 m. Expanded panel: 295×168 px → 0.369 × 0.210 m, radius 13 px → 0.016 m. After the TagAlong scale (0.62), viewed sizes are ~12 cm (minimized) and ~23 cm (expanded) wide — pill is unobtrusive, panel is readable but not dominating.
- Rounded rectangles built via `Shape.quadraticCurveTo` and `<shapeGeometry>`. Border (theme-accent fill) wraps an inset (4 mm) panel-fill shape — a thin emissive ring effect.
- Tap-to-toggle: `onPointerDown` on the fill mesh, with 25 ms haptic pulse (right) + 540 Hz tone.
- New internal `useFpsLabel` hook: averages 1/Δt over 30 frames sampled every 350 ms, returns `{ label, color }` with comfort-band color thresholds (≥90 / ≥72 / ≥45 / below).
- `MinimizedContent`: status dot · FPS numeral · "FPS" sublabel · placeholder "T —" trial counter · expand chevron.
- `ExpandedContent`: status dot + large FPS · "Trial — / —" + sublabel top-right · collapse chevron · divider line · 4-cell metric strip (TARGET 0.28 · BOOST 0.15 · HAPTICS ON · AUDIO OFF) · method label footer ("Direct touch (hands)") on an accent-tinted slab.

**XRRoot wiring:** removed `InXRStats` import; replaced `<HUDPanel><InXRStats/></HUDPanel>` with `<HUDPanel/>`.

**Checks:**
- [x] `tsc --noEmit` clean; preview loads without errors.
- [x] Both states render — code paths for `expanded === true/false` both exercised.
- [ ] Tap-to-expand works on hand + controller — needs headset (Phase 8).
- [ ] Text legibility against bright AR passthrough — Phase 8 visual check.

**Notes / debts (Phase 8):**
- **Trial counter and method label are static placeholders.** Wiring them to real state needs:
  - A trial counter source — `DockingMode` keeps it locally; would need to expose via store/context.
  - The current method label — derive from `currentLab` + active input (controller / hand) in `playgroundStore`.
- **Metrics row is hardcoded** (TARGET 0.28 · BOOST 0.15 · HAPTICS ON · AUDIO OFF). Real values come from Leva controls in each lab; needs a store-backed selector hook.
- **Border emissive only** — no real "shadow blur 7" bloom around the panel. Same Phase 8 polish as the SharedArch glow.
- **`HUDButton.tsx` is now orphaned** (no consumers). Either delete or repurpose as the in-HUD secondary button later in Phase 8.

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
| 2026-04-24 | 4 | [`5764c15`](https://github.com/kewanglab/webxr-playground/commit/5764c15) · cleanup [`930d0d8`](https://github.com/kewanglab/webxr-playground/commit/930d0d8) · ring tweaks [`d53ab92`](https://github.com/kewanglab/webxr-playground/commit/d53ab92) [`5eb4ac4`](https://github.com/kewanglab/webxr-playground/commit/5eb4ac4) | Phase 4 complete. Manipulation · Docking grabbed-object + ghost: themed pods → `KeyCrystal` (shaft + notched pentagonal head + UP indicator). New `ProximityRing` (hand-proximity hint). New `snapToleranceM` / `snapToleranceDeg` fields (0.04 m + 10°) with auto-snap on release + 30 ms haptic success burst. Zen Garden mode unaffected. |
| 2026-04-24 | 5 | [`d494d3c`](https://github.com/kewanglab/webxr-playground/commit/d494d3c) | Phase 5 complete. Locomotion Lab: 3 static comfort rings → numbered teleport waypoint sequence (1 → 2 → 3-as-flagged-destination) with dashed quadratic arcs origin → W1 → W2 → W3. New `NumberedWaypoint`, `DestinationFlag`, `quadArcPoints` helpers. Snap-turn kept at 45° per design review. |
| 2026-04-24 | 6 | [`8d0a0e1`](https://github.com/kewanglab/webxr-playground/commit/8d0a0e1) | Phase 6 complete. New shared VR scenery: `SharedArch` (2.4×1.6 m half-torus + legs) and `StagePlatform` (1.6×0.35 m oval) in `src/xr/visual/SharedScenery.tsx`, themed CP/WN. Wired into `VRScene` at origin behind a `showSharedScenery` Leva toggle. Default flipped OFF after design review (visual quality + position need Phase 8 rework). |
| 2026-04-24 | 7 | (this commit) | Phase 7 complete. HUD: single FPS card → tap-to-expand pill/panel widget per spec HUD_DIMS. Rounded-rect borders (theme accent), self-contained `HUDPanel` with `useFpsLabel` hook. `InXRStats.tsx` deleted (folded in). Trial counter / metrics / method label are static placeholders; wiring them to runtime state is a Phase 8 follow-up. |
