# Repo review — July 2026

A full-repo review pass: intended purpose vs. what ships, bugs found, and prioritized next steps toward making this a portfolio piece that designers, researchers, and builders can understand and use quickly. The companion plan for the lab-scaffold skill (paper → lab, idea → lab) lives in [lab-scaffold-skill-plan.md](./lab-scaffold-skill-plan.md).

## Health check

- `tsc -b` and `vite build` both pass clean.
- Docs are unusually strong: vision / overview / roadmap / pitfalls have clear separation of concerns, and `pitfalls.md` is genuinely valuable institutional memory.
- The four labs, theming, HUD, session logger, capture pipeline, and director mode all exist and are wired coherently.
- The three-files-to-add-a-lab convention is real (`src/config/labs.ts` + component + `LabContent.tsx`).

## Bugs found

Ranked by impact. File references are to the current branch head.

### 1. Docking auto-snap never moves the object (confirmed)

`src/labs/cross-xr/manipulation/DockingMode.tsx` (`onRelease`, ~line 485): on a within-tolerance release the code mutates `result.position` / `result.quaternion` expecting the object to lock onto the target. But `result` is a **clone** made in `useManipulation.releaseActive()` (`useManipulation.ts:109-112`) — mutating it does not touch the entry pose or the rendered `Object3D`. Consequences:

- The object never visually snaps; it stays wherever the hand released it.
- The recorded trial result claims `0` positional/rotational offset — the measurement lies.

Fix direction: have `onRelease` return an optional corrected pose that `releaseActive` applies to the entry (and its `objectRef`), or expose a `setPose(id, pose)` from `useManipulation`.

### 2. Docking object doesn't reset between trials (confirmed)

`ManipulableObject` only re-seeds its pose when `initialPosition` identity changes (table-height changes), so after each trial the key crystal starts wherever the last release left it — often at the previous target. Trial difficulty is therefore uncontrolled and results are not comparable across trials or techniques (the source paper's protocol re-docks each trial from a fixed start). There is also no way to restart the 18-trial sequence without switching lab mode. Fix: reset the entry pose to `objectOrigin` when `trialIndex` advances, and add a "restart trials" affordance (Leva button + HUD).

### 3. Selection Lab's `confirmScaleBoost` does nothing (confirmed)

`SelectionLab.tsx`: the Leva control, HUD metric, and subtitle all surface `confirmScaleBoost`, but `StateOrb` hardcodes the confirm pulse at `1 + 0.08 * sin(...)` (~line 221) and never receives the value. A dead knob in the lab that demos "live tuning" undercuts the core pitch. Fix: pass `boost` into `StateOrb` and use it for the pulse amplitude.

### 4. Every lab renders a black scene when the CDN is unreachable (confirmed by reproduction)

All labs mount `LabHeading` → drei `<Text>`, which **suspends** on troika's `preloadFont`; troika resolves fonts at runtime from `cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver`. In a network-restricted environment (reproduced headlessly in this review), the fetch fails, the promise never resolves, and the whole `XRRoot` `<Suspense fallback={null}>` tree stays unmounted — shell renders, canvas stays black, no error surfaced. Any offline demo, conference Wi-Fi, or locked-down network hits this. Fix: ship a font file in `public/assets/fonts/` and pass `font=` to all `<Text>` (via `LabHeading` and a shared constant), which skips the CDN resolver for latin text.

### 5. Placement Lab likely places two artifacts per trigger pull (verify on device)

`PlacementLab.tsx`: `placeCurrentPreview` is invoked from **both** a session-level `selectstart` listener (~line 600) and the preview group's `onPointerDown` (~line 613). `@pmndrs/xr` drives ray-pointer down events from the same WebXR select event (see `docs/pitfalls.md`, "WebXR event vocabulary"), and the ghost crystal sits exactly on the controller ray, so both paths fire on one trigger pull → two stacked `placed` entries. Invisible visually (identical transforms) but state and logs double-count. Fix: keep one path (the session listener), or debounce by frame.

### 6. Manipulation Lab is right-hand-only and hands-only; README overclaims (confirmed)

- `useHandJoints('right')` is hardcoded in both `DockingMode` and `ZenGardenMode` — left-handed users get a lab that ignores their tracked hand.
- Ray acquisition still early-outs when hand joints aren't tracking (`useManipulation.ts:91`), so **controllers cannot manipulate at all**.
- README says "grab, rotate, scale, and dock objects with hands or controllers": controllers don't work and scaling isn't implemented.
- Related hardcoded handedness: `pulse('right', …)` in `SelectionLab` and `HUDPanel`.

Fix: a Leva `dominantHand` option (or track both hands), controller fallback via grip pose driving the same technique math, and a README truth pass in the meantime.

### 7. Snap/smooth turn pivots around the origin anchor, not the user (comfort bug; verify on Quest)

`LocomotionLab.tsx` rotates `XROrigin` in place. When the wearer has physically stepped away from the origin center, turning sweeps them sideways through space instead of rotating in place — a classic comfort bug. Teleport has the analogous issue: it places the **origin** at the target, so a user standing off-center lands offset from the waypoint. Fix: rotate/translate the origin about the camera's ground-projected position (standard recentered-turn math).

## Hygiene and friction findings

- **Repo weight**: 192 MB git pack. `public/assets` is 134 MB, of which only the nine `xr-kit` GLBs (67 MB) are used at runtime — the three source kits are build-time inputs to `scripts/build-xr-kit-glb.mjs`. `docs/landing/live-tuning.gif` is 23 MB and loads on the README. "Try it in 60 seconds" is not achievable with this clone size.
- **Startup weight**: `preloadXrKitModels()` fetches all 67 MB of GLBs on mount for every lab and theme, including ones that never draw them. The GLBs are uncompressed (no Draco/meshopt, no KTX2) — `column_astra.glb` alone is 15 MB; gltf-transform would likely take the set under ~5 MB.
- **No LICENSE file** — and the committed commercial-looking asset packs (Modular SciFi MegaKit, Molten Maps) need a redistribution check before this repo is promoted publicly. Kenney packs are CC0.
- **No CI, no linter**: `tsc`/build/capture are all local-only; `noUnusedLocals` is off (e.g. unused `labAccents`/`isCloudPark` in `SelectionLab`).
- **Docking results are discarded**: trial measurements — the lab's whole research output — live in component state and render as an end-screen average; nothing reaches the session log or `/api/logs`. Researchers can't take data home.
- Minor: `docs/landing/hero.png` is JPEG data with a `.png` name; README clone URL is a `<this-repo>` placeholder; the dev `/api/logs` endpoint accepts unvalidated writes from anyone on the LAN (`server.host: true`) — fine for dev, worth a comment.

## Next steps toward a portfolio piece

Four tracks, ordered by leverage. Each item is sized S/M/L.

### Track A — instantly seeable (highest leverage)

1. **Deploy a public demo** (M). Static `vite build` on GitHub Pages/Vercel; the log API silently degrades (the logger panel already shows "sync failed"). The pitch is "headset + URL" — there should be an actual URL. Gate: asset diet below, or lazy-load kits.
2. **30-second silent screen recording** (S) — replace the 23 MB GIF with a compressed MP4 hosted in a GitHub release or the deployed site; README embeds a poster frame linking to it.
3. **README truth pass** (S) — real clone URL, correct manipulation claims, link the live demo, per-lab one-liners with the paper citation for manipulation.

### Track B — trustworthy

4. **Fix bugs 1–5 above** (M) — they're all small diffs; 1–3 restore the integrity of the two flagship stories (measurement and live tuning).
5. **CI** (S) — GitHub Action: `tsc -b`, `vite build`, and the canvas-has-signal Playwright smoke on PRs.
6. **LICENSE + asset licensing audit** (S) — MIT/Apache-2 for code; verify kit redistribution rights; document per-asset provenance in `public/assets/README.md`.

### Track C — light

7. **Asset diet** (M): move source kits out of the repo (release asset + `npm run fetch:kits` script, or Git LFS); compress `xr-kit` GLBs with gltf-transform (Draco + KTX2); lazy-load kit models per lab/theme instead of the global preload. Consider a history rewrite once the repo is public-facing (192 MB pack is the clone experience).
8. **Self-host fonts** (S) — fixes bug 4 and makes demos network-independent.

### Track D — useful to the three audiences

9. **Researchers: data export** (M). Persist docking `TrialResult`s to the session log with technique/acquisition metadata; add CSV download to `logs-viewer.html`. This turns "playground" into "instrument" — the strongest differentiator vs. demo repos.
10. **Designers: shareable state URLs** (M). `?lab=` and `?theme=` already exist; add technique/preset params so a felt configuration can be sent as a link.
11. **Builders: CONTRIBUTING + worked lab tutorial** (M). A "build the Hover Lab in 3 files" walkthrough that doubles as the human-readable version of the paper-to-lab skill contract.
12. **The lab-scaffold skill** (L) — see [lab-scaffold-skill-plan.md](./lab-scaffold-skill-plan.md). This is the flagship portfolio story: it demonstrates the repo's whole thesis (agent-scaffolded interaction authoring, from papers *and* from ideas) rather than describing it.
