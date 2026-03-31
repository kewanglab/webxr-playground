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

### Phase 3: Feedback and Evaluation

Improve prototype quality and comparability.

Deliverables:

- reusable hover and confirm feedback primitives (visual, audio, haptic)
- configurable target sizing across labs
- simple session notes capture (exportable observations per lab)
- comfort presets for movement parameters
- input-source-specific parameter tuning (separate controller vs hand thresholds)

### Phase 4: Expansion

Add UI-heavy and advanced interaction studies.

Deliverables:

- `MenuLab` (cross-XR) — world-space panels, wrist-anchored menus, compare input modes
- `ObjectManipulationLab` (cross-XR) — two-handed scaling, rotation, throw/catch
- `UIReadabilityLab` (AR) — text sizing, contrast, and depth in passthrough
- anchored AR object studies

---

## Near-term focus

*Edit this section as your current sprint changes.* Examples: pick the next Phase 4 lab, tighten Quest performance on a specific scene, extend session logging.

- Continue Phase 4 expansion when ready (`MenuLab`, manipulation, AR readability).
- Keep [Overview](./overview.md) directory map in sync when adding new `src/` areas.

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
