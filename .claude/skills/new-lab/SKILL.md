---
name: new-lab
description: Scaffold a new XR interaction lab in webxr-playground from a research source (paper, help-center article, blog post, YouTube video) or a designer's idea. Use whenever the user wants to "spin up a lab", "build a lab from this paper/URL", or "prototype <feature> as a lab".
---

# `new-lab` — scaffold an interaction lab in webxr-playground

This skill turns a research source or a designer's idea into a fully wired, registered, and validated lab inside `webxr-playground`. Each lab isolates one XR interaction question and lives alongside the others under `src/labs/`.

## Repository facts you will rely on

- Stack: Vite + React + TypeScript, `@react-three/fiber`, `@react-three/xr` v6+, `leva` for runtime tuning, `zustand` for app state.
- Lab registry: `src/config/labs.ts` (`LabId` union + `labs` array + optional `tuningPresets` block).
- Lab switcher: `src/app/LabContent.tsx` (one `case` per `LabId`).
- Lab folder layout: `src/labs/{vr,ar,cross-xr}/<Name>Lab.tsx`. Co-locate per-lab hooks/components under `src/labs/<mode>/<lab-slug>/`.
- Shared lab heading: `src/labs/LabHeading.tsx` (use `<LabHeading title={getLabTitle('<id>')} />`).
- Hand tracking utility: `src/labs/cross-xr/manipulation/useHandJoints.ts` — pattern for reading XR joint matrices each frame.
- Feedback primitives: `src/xr/feedback/haptics/useHapticPulse.ts`, `src/xr/feedback/audio/useConfirmTone.ts`.
- HUD reporting: `src/app/useHudReport.ts` — surface live debug numbers in the in-VR HUD.
- Session-mode gating: `@react-three/xr` exports `IfInSessionMode` for VR/AR conditional rendering.
- Scripts: `npm run dev` (Vite dev server on `:5173`), `npm run build` (TS check via `tsc -b` then bundle), `npm run quest` (`adb reverse` for headset over USB), `npm run capture:screenshots` (Playwright visual workflow).
- No `lint` or `typecheck` script exists. Use `npm run build` for TS verification.

## Workflow

Open the run with a `TodoWrite` covering every step below, then work them in order. Mark each one complete as soon as it is verifiably done.

### 1. Intake

Collect from the user, asking via `AskUserQuestion` for anything missing:

- One-sentence goal ("what interaction are we testing?").
- Source material — URLs, PDFs, pasted notes. Empty is allowed but degrades step 2.
- Target XR mode: `vr` | `ar` | `cross-xr` (recommend `cross-xr` when hand tracking is the primary input).
- Kebab-case `LabId` candidate (e.g., `microgesture`, `pinch-drag`). Confirm it does not collide with `src/config/labs.ts`.

### 2. Research

For each source provided:

- Web pages / help-center articles / blog posts → `WebFetch`.
- YouTube URLs → ask the user to paste the auto-generated transcript (or a written summary of the relevant section). Don't try to fetch the transcript yourself — YouTube's pages are not WebFetch-friendly, and shelling out to scrapers is brittle inside sandboxes with MITM TLS.
- PDFs → `Read`.
- If sources are thin, `WebSearch` for the feature name and `WebFetch` up to 3 promising results.

**WebFetch reliability note**: many vendor-owned domains (Meta, Apple, Google), large publishers, and influencer/blog sites return HTTP 403 to WebFetch. When that happens, do **not** stall the skill — fall back to: (a) the `WebSearch` summary itself, which is often enough for a v1 spec, (b) cached/mirror sources (Wayback, alternative coverage), or (c) explicitly ask the user to paste the relevant section. Document which sources were unreachable so the user sees the grounding gap.

Quote the 2–4 source snippets that most concretely describe the activation gesture, sensory feedback, and selection model. These become the citations behind step 3.

### 3. Specify the interaction (confirm before coding)

Produce a short spec inline in chat (no extra file). Cover, at minimum:

- **Inputs**: which body / hand parts and which `XRHand` joints are involved.
- **Activation**: precise condition (e.g., joint distance, joint angle, sustained contact).
- **Confirm / commit event**: how the user "clicks" (if applicable).
- **Deactivation / release**: condition + any hysteresis.
- **Targets / affordances**: what the user is acting on in the scene.
- **Sensory feedback**: visual cue, haptic, audio.
- **Tunable parameters**: every threshold, distance, angle, duration, gain, target position — anything a designer would want to adjust without recompiling.
- **Failure modes**: tracking loss, occluded fingers, false positives, chatter.

**Cross-check against the source** before presenting the spec: quote 2–4 lines from your research that justify each design decision (activation condition, commit event, intended use). If the user's prompt language steers the spec in a direction the source material does not support, surface the conflict in your AskUserQuestion rather than silently going with the prompt. Common trap: the user describes a feature in their own words ("press to start the ray cast"), but the actual product behaves differently ("quick tap opens a teleport arc"). The spec must reflect the *product*, not the *prompt*.

Confirm the spec with the user via `AskUserQuestion` before writing any code. Do not skip this gate.

### 4. Slot

- Mode → `vr` / `ar` / `cross-xr` subdirectory.
- `LabId` (kebab-case) → extend the union in `src/config/labs.ts`.
- Component name → `PascalCase`, suffixed with `Lab` (e.g., `MicrogestureLab`).
- Per-lab helpers folder: `src/labs/<mode>/<lab-slug>/`.

### 5. Scaffold (in this order)

1. **Reuse-first**: before writing any new utility, grep `src/xr/`, `src/labs/cross-xr/manipulation/`, and `src/labs/**/` for anything that already solves your need (`useHandJoints`, `useHapticPulse`, `useConfirmTone`, `useHudReport`, `IfInSessionMode`, scene/visual primitives in `src/xr/visual/`, `src/xr/scene/`). Add new helpers only when nothing fits.
2. **Register** in `src/config/labs.ts`:
   - Extend the `LabId` union.
   - Append an entry to `labs` with `id`, `name`, `mode`, `description`.
   - Add a preset block under `tuningPresets` if the lab has natural defaults worth co-locating with the other labs' presets.
3. **Patch every `Record<LabId, …>` fan-out point.** Run `grep -rn "Record<LabId" src/` and add an entry for your new `LabId` in every match. As of writing the known fan-outs are:
   - `src/config/playgroundTheme.ts` — two `Record<LabId, LabAccentPair>` maps (one per theme preset). Pick a `{ primary, secondary }` pair from the active theme's accent tokens.
   - `src/xr/core/labCameraViews.ts` — `Record<LabId, Record<CaptureViewId, CameraView>>`. Provide `headset` (reuse `HEADSET_VIEW`), `hero`, `side`, `overhead`, `wide` framings.
   - `src/xr/visual/holos/index.ts` — `Record<LabId, ComponentType>`. If you don't author a new glyph, set the entry to `MountainHolo` (the default fallback).
   - Any other match the grep surfaces — patch them too. Skipping this step makes `npm run build` fail with `TS2741: Property '<id>' is missing in type` errors.
4. **Create** `src/labs/<mode>/<Name>Lab.tsx` following the patterns in `SelectionLab.tsx` and `ObjectManipulationLab.tsx`:
   - `<LabHeading title={getLabTitle('<id>')} subtitle="..." />` at the top of the scene (**both props are required**, not just title).
   - `useControls` from `leva` for tunables (see step 6).
   - Hand tracking: the existing `useHandJoints` only exposes wrist, thumb-tip, index-tip, and pinch. If you need other joints (any phalanx, MCP, other fingers), write a new co-located hook in `src/labs/<mode>/<lab-slug>/` that follows the same pattern (`useXRInputSourceState('hand', ...)` + `useGetXRSpaceMatrix` per joint, read per frame in `useFrame`). Don't extend `useHandJoints` for a single lab's needs.
   - Feedback via `useHapticPulse` / `useConfirmTone`. **Note**: `useHapticPulse` is a *controller* haptic — it is a silent no-op when only hand tracking is active. Don't rely on it as the sole feedback channel for a hand-tracking lab; pair it with audio + visual.
   - To move or rotate the player, set `originPosition` / `originRotationY` via `usePlaygroundStore` — these are wired to `<XROrigin>` in `src/xr/core/XRRoot.tsx` and that is the canonical way to teleport / snap-turn.
   - Use `IfInSessionMode` to gate VR-only vs AR-only branches inside a `cross-xr` lab.
5. **Wire** into `src/app/LabContent.tsx` — add `import` and a `case '<id>'` arm to the switch.

### 6. Expose tunables for in-headset tuning (REQUIRED)

Every threshold, distance, angle, duration, gain, toggle, and target position the lab introduces **must** be a `useControls` leva control. Hard-coded magic numbers in the lab body are a bug.

For each control:

- Sensible default (cite source/spec).
- `min` / `max` / `step` for numeric controls.
- Clear label.
- Group under a leva folder named after the lab (use `useControls('<Lab Name>', { ... })`) so different labs' controls do not collide.
- Mirror static-feeling values (e.g., target world positions) into leva too, unless they are scene-structural.

**In-headset reach**: leva is a desktop overlay. Make those controls usable while the headset is on. Pick the right path based on where the dev server is running:

- **Cloud / remote sandbox** (Claude Code on the web; `CLAUDE_CODE_REMOTE=true`): the dev server is in the sandbox, **not** on the user's Mac. The user reaches the playground through whatever preview URL the harness exposes — typically a tunnel or forwarded port. `adb reverse` is meaningless here. In the wrap-up, tell the user: "the dev server is running in the sandbox; open the cloud preview URL on the headset's browser, and tweak leva from the same URL on your laptop."
- **Local Mac with Quest over USB**: the user runs `npm run quest` (`adb reverse tcp:5173 tcp:5173`) and tweaks leva on the connected Mac while wearing the headset. Standard repo workflow.
- **In-VR control panel (preferred when authored)**: check `src/xr/hud/` and `src/ui/` for an existing in-VR control / HUD pattern. If one exists, surface the same controls there. Reuse, don't re-invent.

Use `useHudReport` to expose live values (distances, angles, gesture state) inside the in-VR HUD so the user can confirm a threshold change took effect without taking the headset off.

Audit your scaffold for magic numbers after step 5 and lift any you find into leva.

### 7. Validate

- `npm run build` — must pass (this is the TS check + bundle in this repo). Fix any TS errors before continuing. **Expect `Record<LabId, …>` errors on the first attempt if step 5 was skipped** — go back and patch every fan-out the grep surfaced.
- `npm run dev` — start the dev server on `:5173`. Confirm the new lab appears in the lab switcher and opens without runtime errors. Use the desktop emulator (default on `localhost`) to enter the session.
- If hand tracking is involved, exercise both `handedness` values.
- Sanity-check every leva control: toggle each one and confirm the lab's behavior responds live. Watch for chatter on numeric thresholds.
- **Optional**: run `npm run capture:screenshots` (see `docs/visual-capture.md`) to capture review angles. Mention it in the wrap-up but do not block on it.

### 8. Commit and push

- Commit on the current working branch with a descriptive message (e.g., `Add <Name> Lab via new-lab skill`).
- Push to origin.
- Do **not** open a PR unless the user explicitly asks.

## Wrap-up

In your last message to the user, report:

- **What landed**: files created/modified, with `path:line` references for the registry edits and the new component.
- **Spec**: the inline spec you confirmed in step 3 (one paragraph or compact bullets).
- **Tunables**: full list of leva controls with their defaults and ranges.
- **Validation results**:
  - ✅/‼️ `npm run build`
  - ✅/‼️ `npm run dev` smoke test (lab opens, no console errors)
  - ✅/‼️ Each leva control verified live
  - ✅/‼️ (optional) `npm run capture:screenshots`
- **In-headset tuning path**: state explicitly how the user adjusts the controls while wearing the headset. Pick the right one based on environment:
  - If running in a cloud/remote sandbox: the user opens the harness's preview URL on the headset's browser, and tweaks leva from the same URL on their laptop. Do not tell them to run `npm run quest` in this case — they have no `adb` access to the cloud sandbox.
  - If running locally: the user runs `npm run quest` (`adb reverse tcp:5173 tcp:5173`) and reaches the playground at `http://localhost:5173` from inside the Quest browser.
  - Either way, the leva panel is on the desktop side; the in-VR HUD (via `useHudReport`) is what the user reads inside the headset.
- **Next step**: tell the user the lab is ready for in-headset evaluation and how to enter it.

## Anti-patterns

- Writing new hand-tracking / feedback / heading utilities when an existing one fits.
- Hard-coded thresholds, durations, distances, or target positions in the lab body — every one must be a leva control.
- Skipping step 3's spec confirmation and going straight to code.
- Opening a PR.
- Marking validation ✅ without actually running the command.
- Adding the lab to the switcher but forgetting `src/config/labs.ts`, or vice versa.
