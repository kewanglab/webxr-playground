# WebXR Prototype

Interaction-design playground for fast WebXR prototyping in Cursor, optimized for Meta Quest 3 development on macOS across both VR and AR.

## Purpose

This project is an XR interaction playground, not a single product app. The goal is to explore, compare, and refine interaction patterns quickly before committing them into a larger experience.

The playground is composed of small, focused labs. Each lab isolates one interaction question so it can be tested, tuned, and compared inside a shared prototype shell.

- the whole app is the playground
- each lab is one design experiment
- each experiment belongs to `VR`, `AR`, or `cross-XR`
- reusable interaction pieces live outside the labs so they work across both modes
- both controllers and hand tracking are supported from the start

## Stack

- `Vite` + `React` + `TypeScript`
- `@react-three/fiber`, `@react-three/drei`, `@react-three/xr` (v6+)
- `zustand` (app state) + `leva` (runtime tuning)

## Folder Structure

Directories are created as needed, not pre-emptively. The intended layout:

```text
docs/                         # architecture and planning
public/assets/                # static models, audio clips
src/
  app/                        # playground shell, zustand store, lab switcher
  config/                     # lab registry, XR defaults, presets
  labs/
    ar/                       # AR-only experiments
    cross-xr/                 # experiments for both VR and AR
    vr/                       # VR-only experiments
  ui/                         # desktop overlay controls, debug panel, stats
  xr/
    core/                     # XR store, session config, convenience hooks
    feedback/                 # visual, audio, and haptic feedback primitives
    interactions/             # reusable primitives by behavior (select, grab, placement, locomotion, menu, anchors)
    rigs/                     # extensions over v6 built-in controller/hand components
    scene/                    # shared scene + VR/AR-specific scene layers
```

## How To Think About It

When creating a new lab, ask:

- What interaction am I testing?
- Is this experiment for `VR`, `AR`, or both?
- Does it work with both controllers and hand tracking?
- Which parts should be reusable in other labs?
- Which parts are specific to the environment (VR floor, AR surface placement)?

## Adding a Lab

1. Add an entry to `src/config/labs.ts` with the lab ID, name, and mode
2. Create the component file in the appropriate `src/labs/` subdirectory
3. Add the import to `src/app/LabContent.tsx`

## Working Style

- Keep each lab focused on one interaction question.
- Organize interaction code by behavior (select, grab, place), not by input source (ray, hand, controller).
- Lean on `@react-three/xr` v6 built-ins before building custom systems.
- Use leva for runtime parameter tuning, with defaults defined in `src/config/`.
- Test with both controllers and hand tracking before considering a lab done.
- Test in desktop emulation first, then validate on Quest 3 via `adb reverse`.
- Optimize for clarity and iteration speed before visual polish.

## Next Step

The full implementation plan lives in `docs/project-plan.md`.
