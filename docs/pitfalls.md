# Pitfalls

## Purpose of this document

**Pitfalls** records bugs and footguns we have *already hit* so we do not repeat them. Each section should name a **symptom**, **cause**, and **fix**. Add new top-level `##` sections as you discover issues (XR, Quest, Vite, build tooling, etc.).

**Related docs:** [Overview](./overview.md) (how the system is supposed to work), [Roadmap](./roadmap.md) (what to build next), [README](../README.md) (quick start).

---

Living notes—extend over time. Read this before changing **custom Leva plugins**, **drei `Text` layout**, or **geometry driven by Leva values**.

## Leva, R3F, and black-screen debugging

Short lessons from real bugs (black UI, missing meshes).

### Symptom: UI appears briefly, then the whole view goes black

The root `<Canvas>` is `position: fixed` and fills the screen. If React throws while rendering **Leva** or another overlay that shares the same React tree, the 3D canvas often stays mounted but the scene feels “dead,” and the page reads as all black.

**Fast signal:** the Vite dev terminal prints `[Unhandled error]` with a stack trace—often inside `node_modules/leva/...`. Use that before guessing WebGL or XR.

### Leva: do not use `Components.Number` like a dumb input

Leva’s `Components.Number` (from `leva/plugin`) is wired for Leva’s **internal** number row. It expects a full prop bundle including `settings` (with at least `settings.step`, plus internal fields). Passing only `value` and `onUpdate` leaves `settings` undefined.

**Failure mode:** `TypeError: Cannot read properties of undefined (reading 'step')` → unhandled error → broken render.

**Do instead:**

- Use a plain `<input type="number">` styled with Leva’s `styled` / theme, or
- Avoid a custom plugin for that control and use the built-in schema: `useControls({ x: { value, min, max, step } })`.

This project’s `stepperNumber` plugin intentionally uses a native number input, not `Components.Number`.

### Leva: avoid defaulting numeric params to `0`

In `normalize`, patterns like `value: input.value ?? 0` or a controlled input that falls back to `0` can persist **zero** into the store. For **scale / size** parameters, `0` makes geometry degenerate → **invisible cubes** with no obvious console error.

**Do instead:**

- Default missing values to something in-range (e.g. midpoint `(min + max) / 2`) and/or a stable `seed` in plugin settings.
- In labs, defensively clamp: e.g. `Math.max(MIN_EDGE, coercedSize)` and helpers like `readControlNumber(unknown, fallback)`.

**Selection Lab** uses plain Leva sliders for target size (not the stepper) to keep sizing predictable.

### R3F / drei: `Text` must not be a child of `mesh`

`<Text>` from `@react-three/drei` builds its **own** mesh. Nesting it inside `<mesh>...</mesh>` is not a supported scene graph pattern and can break rendering for that subtree (e.g. cubes “gone”).

**Do instead:**

```tsx
<group position={...}>
  <mesh>...</mesh>
  <Text position={...}>...</Text>
</group>
```

Apply hover/selection scale on the `group` if both should move together.

### Not the same bug: `Stats` in XR

`@react-three/drei` `<Stats />` is a **DOM** element. It does not draw inside an immersive XR session. That is expected; it is unrelated to a full-app black screen unless the entire React tree has crashed.

### Related project files

- `src/ui/levaPlugins/stepperNumber.tsx` — custom numeric UI without `Components.Number`
- `src/labs/cross-xr/SelectionLab.tsx` — group + mesh + Text; plain sliders for size
- `src/app/App.tsx` — `<Canvas>` + desktop-only Leva

---

## WebXR event vocabulary

### Symptom: searching for "pinch" or "grab" in @react-three/xr or @pmndrs/xr returns nothing

The WebXR API uses **generic action names**, not gesture names. The same event fires for different physical gestures depending on the input source:

| WebXR event | Controller gesture | Hand tracking gesture |
|---|---|---|
| `selectstart` / `selectend` / `select` | Trigger pull | **Pinch** (thumb + index) |
| `squeezestart` / `squeezeend` / `squeeze` | Grip button | Not commonly mapped |

**Consequence:** if you search the library code for "pinch," "isPinching," or "pinchStrength," you will find nothing — even though pinch detection is fully built-in. The Quest firmware detects the pinch gesture and fires `selectstart`/`selectend` on the `XRSession`. `@pmndrs/xr` listens for these in `input.js` and pushes them into `XRHandState.events`. The default grab pointer is bound to `'select'` via `bindPointerXRInputSourceEvent`.

**Rule of thumb:** when a feature clearly works in practice (e.g., grab pointer responds to pinch), trace the working code path instead of searching for a keyword. The abstraction layer may use different vocabulary than you expect.

### Related project files

- `node_modules/@pmndrs/xr/dist/input.js` — sets up `selectstart`/`selectend` listeners on session
- `node_modules/@pmndrs/xr/dist/pointer/event.js` — `bindPointerXRInputSourceEvent` routes session events to pointer down/up
- `node_modules/@pmndrs/xr/dist/vanilla/default.js` — wires grab pointer at `index-finger-tip` with `'select'` event

---

## Visual capture screenshots can look stale

### Symptom: a camera fix appears not to change the screenshot

During camera-angle iteration, the capture command overwrites the same PNG path, but the review surface may still show the previous image or make it unclear which attempt is being discussed. This is especially confusing for overhead captures, where small camera-roll differences are judged by ground-grid alignment.

**Cause:** repeated screenshots share the same filename, so browser/app image caching and human review context can blur together. The code may have changed, the PNG may have been regenerated, and the displayed image may still be an older artifact.

**Fix:** when reviewing an important camera adjustment, copy the generated PNG to a unique, intent-named filename before sharing it:

```bash
cp docs/mockups/captures/scenes/cloud-park/selection-overhead.png \
  docs/mockups/captures/scenes/cloud-park/selection-overhead-mat-center-orthographic.png
```

Prefer names that state the spatial claim being tested:

- `selection-overhead-mat-center-orthographic.png`
- `selection-overhead-hero-axis-wide-fit.png`
- `locomotion-overhead-full-path.png`

For true overhead review, also check the image itself: ground-grid lines intended to be horizontal or vertical should be parallel to the image edges. If they are not, the capture is not a trustworthy plan view.

### Related project files

- `docs/visual-capture.md` — capture workflow and naming guidance
- `tests/visual/capture.spec.ts` — generated screenshot set
- `src/xr/core/DesktopPreviewCamera.tsx` — authored review camera presets

---

<!-- Add new ## Section titles below for other domains (e.g. Quest browser, adb reverse). -->
