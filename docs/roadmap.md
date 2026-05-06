# Roadmap

## Purpose of this document

**Roadmap** is for *what we are building and in what order*: phased deliverables, expansion ideas, and a short **near-term** section you edit as priorities shift. It is expected to change often.

**Related docs:** [Vision](./vision.md) (why this exists and where it's heading), [Overview](./overview.md) (architecture and conventions), [Pitfalls](./pitfalls.md) (known footguns), [README](../README.md) (quick start).

---

## Current status (April 2026)

| Phase | State |
|-------|--------|
| **1 — Cross-XR skeleton** | **Done** |
| **2 — First labs** | **Done** — Selection, Placement, Locomotion. |
| **3 — Object Manipulation Lab** | **Done** — VHI/VHS, docking + zen, proximity + hand-ray acquisition; see Phase 3 below. |
| **4 — Spatial polish** | **In progress** — theme/XR foundations plus Selection, Locomotion, Docking, and Placement recovery passes landed, including second-pass correctness fixes for reachability, target visibility, and AR placement; Quest validation remains and is tracked in [XR scene enhancement plan](./xr-scene-enhancement-plan.md). |
| **5 — Interaction platform** | **Not started** — shared primitives (`src/xr/interactions/`), cross-lab A/B preset UI, shared feedback library. |
| **6 — Expanded labs & AR** | **Not started** — MenuLab, UIReadabilityLab, deeper AR studies (after Phase 5 where noted). |

---

## Development Priorities

### Phase 1: Cross-XR Skeleton

Create the playground shell, XR session with both controllers and hand tracking, and a working lab routing structure.

Deliverables:

- Vite + React + TypeScript project with XR dependencies
- app entry point with Canvas and XR provider
- `createXRStore()` configured with `hand-tracking` and `hit-test` features
- state-based lab switcher (zustand)
- desktop UI with VR/AR entry buttons and lab selector
- leva debug panel shell
- performance stats overlay (drei `<Stats>`)
- shared scene with lighting and reference grid
- VR scene layer (floor plane) and AR scene layer (passthrough-safe)
- both controllers and hands enabled from the start
- `adb reverse` device testing verified on Quest 3

### Phase 2: First Labs

Implement a small set of high-value interaction studies. Each lab should work with both controller and hand input.

Deliverables:

- `SelectionLab` (cross-XR) — compare selection via ray, direct touch, and hand pinch; tune hover/confirm feedback
- `PlacementLab` (AR) — place objects on detected surfaces using hit-test; compare placement accuracy with controllers vs hands
- `LocomotionLab` (VR) — teleport with `<TeleportTarget>`, smooth movement, snap/smooth turning

These three labs establish the core reusable interaction and feedback primitives.

### Phase 3: Object Manipulation Lab (complete)

This phase delivered the research-backed manipulation experience. **Shared primitive graduation, cross-lab A/B UI, and a reusable feedback layer** are **Phase 5**; **visual theming** is **Phase 4**.

#### ObjectManipulationLab (cross-XR)

**Shipped today:** Integrated (VHI) vs separated (VHS) **virtual-hand** manipulation with paper-aligned mapping (wrist-driven translation + thumb-orientation rotation for separated; integrated uses pinch-point pivot). **Acquisition:** proximity pinch (OBB hit volume) or framework **hand ray** (pinch to grab, pinch release drops even when the ray leaves the mesh). **Modes:** Docking (sequential trials with measured offsets) and Zen Garden (free arrangement). Shared **LabHeading** pattern across labs.

**Deferred / not in repo:** Hand-ray *manipulation* techniques **HRI/HRS** (custom stick/shoulder-ray mapping) — may return as a dedicated lab; **Gaze&Pinch** when eye tracking is available.

Based on: *"DOF-Separation for 3D Manipulation in XR"* (Mikkelsen et al., ISMAR 2025). The paper investigates separating 6DOF hand movement into independent 3DOF translation (wrist position) and 3DOF rotation (wrist orientation) controls during pinch-manipulation, compared against the standard integrated 6DOF mapping.

**Core interaction question:** Does separating translation and rotation control improve manipulation accuracy and feel across different acquisition techniques?

**Techniques (grab domain — paper + extensions):**

Each integrated vs separated pair applies to a given *acquisition* path (virtual hand vs ray-based manipulation).

- **Virtual Hand Integrated (VHI)** — implemented (thumb-tip mapping with pinch-point pivot for rotation feel)
- **Virtual Hand Separated (VHS)** — implemented (wrist translation, thumb-orientation rotation)
- **Hand Ray Integrated (HRI)** — not implemented (was scoped out; custom ray/stick mapping may be a separate lab)
- **Hand Ray Separated (HRS)** — not implemented (same)
- **Acquisition today:** proximity pinch vs framework **hand ray** (for targeting only; manipulation math is still VHI/VHS)

Gaze&Pinch is a future expansion (requires eye tracking hardware — Quest Pro or similar).

**Two modes:**

**Docking Mode (structured A/B comparison):**

Faithful to the paper's evaluation design. A target object (cube with asymmetric inner shape, e.g., Stanford bunny) appears and animates to its destination position/rotation. User pinch-acquires and manipulates to match. Three complexity levels: Translation only, Rotation only, Combined (translation + rotation). Measures positional offset, rotational offset, and completion time. This is where structured A/B comparison happens — switch techniques between trials and compare measured accuracy.

**Zen Garden Mode (creative exploration):**

A relaxed arrangement task for feeling the qualitative difference between techniques. A low wooden platform or shallow sand tray at arm's reach. Asymmetric natural objects — river stones, driftwood branches, flowers — available from a floating side shelf. Users grab objects, position and orient them freely to compose an arrangement. No "correct" answer; the point is to feel how each grab technique handles precise rotation and placement of organic shapes. Includes:

- Asymmetric low-poly objects where orientation visibly matters (a flat stone tilted vs lying flat reads completely differently)
- Technique switching via Leva — swap integrated vs separated (and acquisition) mid-arrangement; full primitive picker / cross-lab library still TBD (Phase 5)
- Optional harmony guides (toggle-able subtle hints for pleasing orientations)
- Snapshot button to capture the arrangement + active technique as a log entry
- Calm ambient lighting, minimal visual noise

The Zen Garden makes the "feel" difference between techniques immediately obvious in a way the docking task can't — "rotating this branch was so much easier with separated mode" is the insight.

**Leva-tunable parameters (both modes):** grab distance threshold, CD gain, DOF-separation pivot point, target offset distances (docking), rotation angles (docking), pinch detection sensitivity, 1-euro filter smoothing.

**Key paper findings to validate (docking mode):**
- HRS should feel dramatically better than HRI for rotation tasks
- VHS should help on difficult combined tasks but may feel less natural on simple ones
- The "stick" metaphor (HRI) should feel frustrating — a useful negative baseline

### Phase 4: Spatial polish & visual implementation

**Priority:** Ship the direction in [Spatial polish plan](./spatial-polish-plan.md) and the token specs in [style templates](./style-templates/README.md), optimized for Quest-class WebXR (cheap materials, few lights, no render-loop thrash).

**Deliverables:**

- **Theming module** — e.g. `src/config/playgroundTheme.ts` exporting `shell` (2D), `xr` (Three.js), and `levaThemeFromShell()`; presets (`default`, optional `highContrast` / shell variants) with `localStorage` + optional `?theme=` query
- **Shell** — apply semantic tokens as CSS variables on the document root; restyle playground chrome, lab chips, session controls, logger panel ([shell-2d.md](./style-templates/shell-2d.md))
- **XR** — fog, grid/floor, unlit skydome gradient, AR alignment cues, TagAlong HUD frame from [xr-3d.md](./style-templates/xr-3d.md); read tokens in `useEffect` / store updates, not `getComputedStyle` per frame
- **Leva** — theme derived from shell tokens so the tuning panel matches the page
- **Mockups** — regenerate or replace frames under `docs/mockups/spatial-polish/` once the palette is locked (existing PNGs are layout-only references)
- **Device validation** — frame time and readability on Quest after each visual pass

### Phase 5: Interaction platform (primitives, A/B, feedback)

Builds on Phases 1–3. **MenuLab and broader AR labs (Phase 6) should reuse this layer** where possible.

#### 5a. Interaction primitive library

The playground's core value as a platform: labs **produce** graduated interaction variants and **consume** variants from other labs. Think of it as a design system, but for XR interactions. This is also where the *combinatorial* value emerges — the mix-and-match across labs is what surfaces emergent interaction patterns no single paper would have proposed alone (see [Vision](./vision.md)).

**How it works for users:**

Each interaction domain (locomotion, selection, grab, placement, etc.) can have multiple graduated variants. Inside any lab, a per-lab primitive picker lets the user choose which variant to use for each relevant domain and mix-and-match freely. Selections persist across browser refresh (localStorage).

Example — inside ObjectManipulationLab:

| Domain | Available variants | Source |
|---|---|---|
| Locomotion | Teleport, Smooth move, Snap turn | Graduated from LocomotionLab |
| Selection | Ray, Direct touch, Pinch | Graduated from SelectionLab |
| Grab | *(this lab's own experiments — not yet graduated)* | Built here |

Each lab declares which domains are swappable and which are fixed (its own experimental focus). A lab's own experiments live as local variants first, then graduate into the shared library when ready.

**Domain contracts (the "plug shape"):**

For variants within a domain to be interchangeable, they all need to do the same fundamental thing. The exact code shape of each contract emerges when the first variants in that domain graduate — we define it once, then every future variant follows the same pattern.

Known domains and their contracts:

| Domain | What every variant must do | First variants from |
|---|---|---|
| **Locomotion** | Update the player position | LocomotionLab (teleport, smooth move, snap turn) |
| **Selection** | Report when something is selected or deselected | SelectionLab (ray, direct touch, pinch) |
| **Grab** | Report when an object is grabbed, where it should follow each frame, and when it's released | ObjectManipulationLab (VHI, VHS; ray acquisition for targeting) |
| **Placement** | Place an object on a surface and confirm its position | PlacementLab (hit-test placement) |

New domains are added when a lab needs a new category of interchangeable behavior. The contract table above is the reference — update it as domains are defined.

**Graduation flow:**

1. **Build inside a lab** — interaction logic starts coupled to the lab, iterate until it feels right on Quest 3
2. **Standardize** — make sure it follows the domain's shared contract so it can plug into other labs
3. **Extract** — move into `src/xr/interactions/<domain>/` with a clean API and barrel export
4. **Validate** — import it back into the originating lab via the primitive picker to prove it works standalone
5. **Available** — other labs can now offer it as a choice in their primitive picker

Also extract mature interaction logic from existing Phase 2 labs (SelectionLab, PlacementLab, LocomotionLab) as the first graduated variants.

#### 5b. A/B comparison (within-domain)

Add a reusable A/B testing pattern scoped to individual domains:

- **Named presets per domain** (e.g., "Grab A: velocity throw" vs "Grab B: snap release") that swap a bundle of leva parameters at once
- **Preset switcher** UI — buttons or toggle visible both on desktop and in-headset HUD
- **Quick log prompt** after switching — "which felt better? any notes?" to capture immediate reactions
- Presets are defined in lab config alongside default tuning values

Starts with within-domain comparison (compare two grab variants, or two locomotion variants). Cross-domain loadout comparison (full combination testing) is a future extension.

This keeps comparison lightweight (no timed trials or forced-choice protocol yet) while making every lab immediately useful for structured evaluation.

#### 5c. Feedback and evaluation improvements

- Reusable hover and confirm feedback primitives (visual, audio, haptic)
- Configurable target sizing across labs
- Comfort presets for movement parameters
- Input-source-specific parameter tuning (separate controller vs hand thresholds)

### Phase 6: Expanded labs & AR (future)

New labs and studies **after** the interaction platform (Phase 5) exists where reuse is intended.

Deliverables:

- `MenuLab` (cross-XR) — world-space panels, wrist-anchored menus, compare input modes; reuses grab/selection primitives from Phase 5
- `UIReadabilityLab` (AR) — text sizing, contrast, and depth in passthrough
- Anchored AR object studies
- Additional research-driven labs as papers are identified (e.g. dedicated HRI/HRS manipulation experiments, Gaze&Pinch when hardware allows)

### Horizon: new input modalities & agentic harness

Two long-term investment tracks, run in parallel with the phased work above. See [Vision](./vision.md) for the full framing.

**New input modalities.** Eye-gaze (Quest Pro, Vision Pro) and EMG (Meta's neural wristband, CTRL-Labs lineage) plug in behind the same behavior-first primitives, so every existing lab inherits them on day one rather than requiring a rewrite. New modalities surface as additional pointer/source types inside `src/xr/interactions/`, not as parallel lab forks.

**Agentic harness for scaffolding labs.** A growing layer of rules, skills, and agent prompts (`CLAUDE.md`, `AGENTS.md`, Claude Code skills, Cursor rules) that lets an AI agent take a research paper PDF or a napkin idea and scaffold a working lab — registry entry, component file, leva controls, measurement hooks, session-logger integration. The three-files-to-add-a-lab convention (config entry + component + LabContent import) is the seed; the harness compounds on top of it. Every convention added to [Overview](./overview.md) — naming, type placement, lab contracts — is also an investment in what an agent can do reliably.

Concrete near-term harness work:

- Create `CLAUDE.md` and tighten `AGENTS.md` so they describe the lab-scaffolding contract explicitly
- Add Claude Code skills for "scaffold a new lab from this paper" and "graduate this primitive into the shared library"
- Capture the current lab patterns (LabHeading, leva conventions, session-logger integration) as agent-readable templates

---

## Near-term focus

*Edit this section as your current sprint changes.*

- **Now (Phase 4):** Run **Quest validation + perf logging** from [XR scene enhancement plan](./xr-scene-enhancement-plan.md), then decide whether any lab needs a second headset-driven refinement pass
- **Already landed in Phase 4:** theme module, shell polish, XR foundations, authored desktop preview framing, Selection eye-level staging, Locomotion reachability fix, Docking target-volume plus eye-level bench anchoring, and the correctness-first Placement rewrite
- **Alongside:** Optional Quest hardening passes on **ObjectManipulationLab** (docking + zen); decide later whether **HRI/HRS** land in Phase 6 as a small dedicated lab
- **Then (Phase 5):** **Primitive graduation** into `src/xr/interactions/`, then shared **A/B preset** UI and **feedback** primitives
- **Then (Phase 6):** **MenuLab** and AR expansion labs once Phase 5 primitives are available where reuse matters
- **In parallel (horizon):** build out the **agentic harness** (`AGENTS.md`, a planned `CLAUDE.md`, Claude Code skills) so agents can scaffold a new lab from a paper; track new input modalities (eye-gaze, EMG) as primitives, not bespoke labs
- Keep [Overview](./overview.md) directory map in sync when adding new `src/` areas

---

## Appendix: Original bootstrap checklist (completed)

Early plan for initial setup—kept for history. Most items are done.

1. Initialize the project with Vite, React, and TypeScript.
2. Install XR dependencies: `three`, `@react-three/fiber`, `@react-three/drei`, `@react-three/xr`, `zustand`, `leva`.
3. Create `App.tsx` with Canvas, XR store (hand-tracking enabled), and desktop controls.
4. Create `XRRoot.tsx` with `<XR>`, `<XROrigin>`, shared scene, and lab content area.
5. Create the lab registry in `src/config/labs.ts` and `LabContent.tsx` switcher.
6. Add leva debug panel and drei `<Stats>` overlay.
7. Build one end-to-end cross-XR lab (`SelectionLab`) with both controller and hand input.
8. Set up `adb reverse` and validate on Quest 3.
