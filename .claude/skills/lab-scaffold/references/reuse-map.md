# Reuse map & feasibility reference

Check this before writing any new system. The playground already has more than
it looks like from a lab file.

## Interaction & evaluation

| Need | Use | Where |
|---|---|---|
| Trial sequencing (index, results, feedback hold, restart) | `useTrialRunner` | `src/xr/interactions/evaluation/` |
| Persist a trial result (note + machine-readable `data`) | `logTrialResult` | `src/xr/interactions/evaluation/` |
| Grab/manipulate math (integrated & separated DOF) | `useManipulation`, `techniques.ts` | `src/labs/cross-xr/manipulation/` |
| Hand joint poses + pinch state (per hand) | `useHandJoints(handedness)` | `src/labs/cross-xr/manipulation/` |
| A grabbable/registered object | `ManipulableObject` | `src/labs/cross-xr/manipulation/` |
| AR surface placement via hit-test | worked example in `PlacementLab` | `src/labs/ar/PlacementLab.tsx` |
| Teleport | `<TeleportTarget>` (v6 built-in) + head-offset landing | `src/labs/vr/LocomotionLab.tsx` |
| Smooth move / snap & smooth turn (head-pivot) | worked example in `LocomotionLab` | `src/labs/vr/LocomotionLab.tsx` |

## Feedback & UI

| Need | Use | Where |
|---|---|---|
| Controller haptic pulse | `useHapticPulse()(hand, intensity, ms)` | `src/xr/feedback/haptics/` |
| Confirmation tone | `useConfirmTone()(freqHz, ms)` | `src/xr/feedback/audio/` |
| In-scene text (self-hosted font — never drei Text directly) | `Text` from `XRText` | `src/xr/visual/XRText.tsx` |
| Lab title + config subtitle | `LabHeading` | `src/labs/LabHeading.tsx` |
| In-headset metrics | `useHudReport` (≤4 cells) | `src/app/useHudReport.ts` |
| Numeric Leva rows with steppers | `stepperNumber` (read pitfalls first) | `src/ui/levaPlugins/` |
| Normalize Leva numeric reads | `readLevaNumber(value, fallback)` | `src/ui/levaPlugins/` |

## Staging & theming

| Need | Use | Where |
|---|---|---|
| Theme tokens (never hardcode hex) | `usePlaygroundTheme()` → `xr`, `shell`, `labAccents` | `src/xr/theme/` |
| Arch + stage platform framing | `SharedArch`, `StagePlatform` | `src/xr/visual/SharedScenery.tsx` |
| Cloud Park props (mats, shadow blobs, wind lines…) | `CloudParkScenery` exports | `src/xr/visual/CloudParkScenery.tsx` |
| Per-lab holo glyphs | `src/xr/visual/holos/` | barrel export |
| Kit GLB props | `KitInstance` | `src/xr/visual/useKitModel.tsx` |
| Eye-level staging offset in XR | `useInitialEyeLevelOffset` | `src/xr/core/` |
| Session/mode state | `useXRMode`, `useIsAR`, `useIsVR`, `useIsInXR` | `src/xr/core/hooks.ts` |

## Input feasibility on the current target (Quest 3 WebXR)

| Sensing | Available? | Notes / approximation |
|---|---|---|
| Controller rays, buttons, thumbsticks, haptics | yes | `useXRInputSourceState('controller', side)` |
| Hand tracking joints (25/hand) | yes | pinch = firmware `selectstart`/`selectend` — search for "select", not "pinch" (pitfalls) |
| Direct touch / poke | yes | `pointerEventsType: 'touch'` |
| Near-field grab | yes | `pointerEventsType: 'grab'` |
| Hit-test on real surfaces (AR) | yes | `<XRHitTest>`; see PlacementLab |
| Plane/mesh detection | yes (Quest 3) | session features |
| Eye tracking / gaze | **no** | approximate with head-gaze (camera forward ray); label the approximation |
| EMG / neural wristband | **no** | cut, or approximate with pinch-strength proxies; label it |
| Full body tracking | **no** | cut |
| Passthrough camera pixels | **no** (privacy-gated) | cut |

When a paper's technique needs a "no" row: the spec either cuts it (Scope cuts,
like the repo's HRI/HRS precedent) or names the approximation in both the spec
and the lab subtitle. Never ship an approximation that pretends to be the real
sensing.
