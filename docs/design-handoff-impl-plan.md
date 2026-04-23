# Design handoff · implementation plan

**Status:** Phase 0 complete · Phase 1 next
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

## Phase 1 · Tokens foundation

One central source; everything else reads from it. No visible change yet.

**Target files:**
- [src/config/playgroundTheme.ts](../src/config/playgroundTheme.ts) — extend to match Handoff Section 01

**What to add:**
- Full CP + WN palettes per spec (orb states, affordances, HUD, shell)
- Typography scale (DM Sans / DM Mono, size tokens)
- HUD dimensions (minimized 158×38, expanded 295+, radii)
- Glow recipes (CP ambient-only, WN ember blur values)

**Checks:**
- [ ] Existing callers still compile
- [ ] No visual regression with current cubes
- [ ] Copy values from `TOKENS_JSON` in the Handoff tab verbatim (don't re-type)

## Phase 2 · Selection Lab

Biggest visual overhaul. Combines geometry swap + state materials + transitions + repositioning.

**Target files:**
- [src/labs/cross-xr/SelectionLab.tsx](../src/labs/cross-xr/SelectionLab.tsx)
- [src/config/labs.ts](../src/config/labs.ts) — target positions

**Spec changes:**

| Aspect | Current code | Target |
|---|---|---|
| Geometry | 3 cubes, `targetSize` edge | 3 spheres, same `targetSize` as diameter, Leva range unchanged |
| Ray position | (−0.45, 1.25, −1.25) | (0, 1.60, −2.20) — eye-level, far back |
| Pinch + Touch positions | mixed layout | symmetric: (−0.30, 1.35, −0.55) + (+0.30, 1.35, −0.55) |
| State materials | basic hover highlight | idle / targeted / confirmed per Handoff Section 02 |
| State transitions | instant | 120 ms ease-out, 1.2 Hz pulse, 180+220+220 ms confirm choreography (Section 03) |
| Affordance hints | none | ray arrow · pinch calipers · touch ring, color-tinted per theme |

**Checks:**
- [ ] All Leva tunables still work (size, opacity, haptics, audio)
- [ ] Hand and controller input both hit targets
- [ ] Pulse rate matches 1.2 Hz on the headset (time with a stopwatch or FPS count)
- [ ] CP ring uses alpha only, no shadow blur; WN uses ember glow blur 12

## Phase 3 · Placement Lab

**Target files:**
- [src/labs/ar/PlacementLab.tsx](../src/labs/ar/PlacementLab.tsx)

**Spec changes:**

| Aspect | Current code | Target |
|---|---|---|
| Crystal geometry | cube, `objectSize` edge | diamond prism, same `objectSize` characteristic dimension |
| Ghost preview material | basic | hatched 45°, dashed outline, cool-tinted halo (Section 02) |
| Controller ray reticle | framework default | ellipse + crosshair, warm amber/red per theme |
| Pinch halo ring | n/a | flat ellipse above fingertip, dashed teal/cool |

**Checks:**
- [ ] Hit-test still anchors to detected floor
- [ ] Ghost follows hand; snaps on pinch release
- [ ] Controller ray reticle visible without covering targets

## Phase 4 · Manipulation Lab (Docking mode only)

Zen Garden mode stays untouched — parallel dropdown option.

**Target files:**
- [src/labs/cross-xr/manipulation/DockingMode.tsx](../src/labs/cross-xr/manipulation/DockingMode.tsx)
- [src/labs/cross-xr/manipulation/useManipulation.ts](../src/labs/cross-xr/manipulation/useManipulation.ts)
- [src/config/labs.ts](../src/config/labs.ts) — dock snap tolerances

**Spec changes:**

| Aspect | Current code | Target |
|---|---|---|
| Grabbable geometry | cube, `objectSize` edge 0.125 m | key-crystal: shaft + notched head + UP indicator, same `objectSize` as height |
| Dock snap tolerance | **0.30 m + 45°** (forgiving) | **0.04 m + 10°** (tight · skill-based) |
| Ghost target pose | none | dashed outline of upright key at dock, UP arrow visible |
| Proximity ring | none | 0.24 m dashed ring, appears when hand enters grab zone |
| Dock snap motion | instant | 240 ms ease-out-back, 30 ms haptic success burst |

**Checks:**
- [ ] Zen Garden mode unaffected (dropdown switches cleanly)
- [ ] Tight snap tolerance doesn't feel punishing (playtest on headset)
- [ ] Ghost UP arrow orientation changes with target pose

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
