# Roadmap

## Purpose of this document

**Roadmap** is for *what we are building and in what order*: phased deliverables, expansion ideas, and a short **near-term** section you edit as priorities shift. It is expected to change often.

**Related docs:** [Overview](./overview.md) (architecture and conventions), [Pitfalls](./pitfalls.md) (known footguns), [README](../README.md) (quick start).

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

### Phase 3: Object Manipulation Lab + Primitive Graduation + A/B Testing

The next push does triple duty: build a research-backed lab, establish the pattern for extracting reusable primitives, and add A/B comparison infrastructure that all labs can use.

#### 3a. ObjectManipulationLab (cross-XR)

Based on: *"DOF-Separation for 3D Manipulation in XR"* (Mikkelsen et al., ISMAR 2025). The paper investigates separating 6DOF hand movement into independent 3DOF translation (wrist position) and 3DOF rotation (wrist orientation) controls during pinch-manipulation, compared against the standard integrated 6DOF mapping.

**Core interaction question:** Does separating translation and rotation control improve manipulation accuracy and feel across different acquisition techniques?

**Techniques to implement (grab domain variants):**

Each technique has an Integrated (standard 6DOF) and Separated (split translation/rotation) mode:

- **Virtual Hand Integrated (VHI)** — direct 1:1 mapping, thumb tip drives both translation and rotation
- **Virtual Hand Separated (VHS)** — wrist joint drives translation, thumb orientation drives rotation independently; forward offset compensates reach difference
- **Hand Ray Integrated (HRI)** — "stick" metaphor via wrist-based ray; wrist tilt displaces object along the stick
- **Hand Ray Separated (HRS)** — shoulder-to-wrist ray for pointing/acquisition; post-pinch wrist rotation maps to object rotation without displacement (MRTK-style)
Gaze&Pinch is a future expansion (requires eye tracking hardware — Quest Pro or similar). Current scope: **4 grab variants** (VHI, VHS, HRI, HRS) on Quest 3.

**Two modes:**

**Docking Mode (structured A/B comparison):**

Faithful to the paper's evaluation design. A target object (cube with asymmetric inner shape, e.g., Stanford bunny) appears and animates to its destination position/rotation. User pinch-acquires and manipulates to match. Three complexity levels: Translation only, Rotation only, Combined (translation + rotation). Measures positional offset, rotational offset, and completion time. This is where structured A/B comparison happens — switch techniques between trials and compare measured accuracy.

**Zen Garden Mode (creative exploration):**

A relaxed arrangement task for feeling the qualitative difference between techniques. A low wooden platform or shallow sand tray at arm's reach. Asymmetric natural objects — river stones, driftwood branches, flowers — available from a floating side shelf. Users grab objects, position and orient them freely to compose an arrangement. No "correct" answer; the point is to feel how each grab technique handles precise rotation and placement of organic shapes. Includes:

- Asymmetric low-poly objects where orientation visibly matters (a flat stone tilted vs lying flat reads completely differently)
- Technique switching via the primitive picker — swap between VHI, VHS, HRI, HRS mid-arrangement
- Optional harmony guides (toggle-able subtle hints for pleasing orientations)
- Snapshot button to capture the arrangement + active technique as a log entry
- Calm ambient lighting, minimal visual noise

The Zen Garden makes the "feel" difference between techniques immediately obvious in a way the docking task can't — "rotating this branch was so much easier with separated mode" is the insight.

**Leva-tunable parameters (both modes):** grab distance threshold, CD gain, DOF-separation pivot point, target offset distances (docking), rotation angles (docking), pinch detection sensitivity, 1-euro filter smoothing.

**Key paper findings to validate (docking mode):**
- HRS should feel dramatically better than HRI for rotation tasks
- VHS should help on difficult combined tasks but may feel less natural on simple ones
- The "stick" metaphor (HRI) should feel frustrating — a useful negative baseline

#### 3b. Interaction primitive library

The playground's core value as a platform: labs **produce** graduated interaction variants and **consume** variants from other labs. Think of it as a design system, but for XR interactions.

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
| **Grab** | Report when an object is grabbed, where it should follow each frame, and when it's released | ObjectManipulationLab (VHI, VHS, HRI, HRS) |
| **Placement** | Place an object on a surface and confirm its position | PlacementLab (hit-test placement) |

New domains are added when a lab needs a new category of interchangeable behavior. The contract table above is the reference — update it as domains are defined.

**Graduation flow:**

1. **Build inside a lab** — interaction logic starts coupled to the lab, iterate until it feels right on Quest 3
2. **Standardize** — make sure it follows the domain's shared contract so it can plug into other labs
3. **Extract** — move into `src/xr/interactions/<domain>/` with a clean API and barrel export
4. **Validate** — import it back into the originating lab via the primitive picker to prove it works standalone
5. **Available** — other labs can now offer it as a choice in their primitive picker

Also extract mature interaction logic from existing Phase 2 labs (SelectionLab, PlacementLab, LocomotionLab) as the first graduated variants.

#### 3c. A/B comparison (within-domain)

Add a reusable A/B testing pattern scoped to individual domains:

- **Named presets per domain** (e.g., "Grab A: velocity throw" vs "Grab B: snap release") that swap a bundle of leva parameters at once
- **Preset switcher** UI — buttons or toggle visible both on desktop and in-headset HUD
- **Quick log prompt** after switching — "which felt better? any notes?" to capture immediate reactions
- Presets are defined in lab config alongside default tuning values

Starts with within-domain comparison (compare two grab variants, or two locomotion variants). Cross-domain loadout comparison (full combination testing) is a future extension.

This keeps comparison lightweight (no timed trials or forced-choice protocol yet) while making every lab immediately useful for structured evaluation.

#### 3d. Feedback and evaluation improvements

Pulled forward from the original Phase 3 plan, done alongside or shortly after the manipulation lab:

- reusable hover and confirm feedback primitives (visual, audio, haptic)
- configurable target sizing across labs
- comfort presets for movement parameters
- input-source-specific parameter tuning (separate controller vs hand thresholds)

### Phase 4: Menu Lab + AR Expansion

Build on the graduated primitives and A/B infrastructure from Phase 3.

Deliverables:

- `MenuLab` (cross-XR) — world-space panels, wrist-anchored menus, compare input modes; reuses grab/selection primitives from Phase 3
- `UIReadabilityLab` (AR) — text sizing, contrast, and depth in passthrough
- anchored AR object studies
- additional research-driven labs as papers are identified

---

## Near-term focus

*Edit this section as your current sprint changes.*

- **Now:** Build `ObjectManipulationLab` — implement DOF-Separation docking task (Mikkelsen et al. ISMAR 2025) with Virtual Hand + Hand Ray variants (4 grab techniques); add Gaze&Pinch when eye tracking is available
- **Alongside:** Establish primitive graduation flow during the manipulation lab build; extract first shared primitives into `src/xr/interactions/`
- **Alongside:** Build A/B preset infrastructure as a reusable pattern, validate it inside the manipulation lab
- **Then:** `MenuLab`, leveraging graduated primitives and A/B presets
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
