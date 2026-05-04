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

## Beauty captures can regress into QA captures

### Symptom: Cloud Park looks technically correct but emotionally flat

The scene has the right theme colors and objects, but the screenshot still reads like a grid floor with testing props. This usually means the reference grid, labels, or flat floor plane became the subject before atmosphere and staged objects did.

**Cause:** XR QA helpers are useful for measurement, but they can overpower a beauty frame. In Cloud Park, a visible grid should be a quiet spatial reference, not the visual identity.

**Fix:** when tuning Cloud Park captures, check the scenic stack first: foreground/midground/horizon, cloud mats, soft landmarks, wind lines, readable props, and uncropped objects. Only then check the grid. If the grid is the first thing you notice, lower its contrast, fade distance, or thickness for the Cloud Park preset.

### Related project files

- `src/xr/scene/VRScene.tsx` — Cloud Park grid and floor treatment
- `src/xr/visual/CloudParkScenery.tsx` — shared scenic atmosphere and lab-set primitives
- `docs/visual-capture.md` — beauty review checklist

---

## Cloud Park can regress into recolored lab props

### Symptom: the palette is right, but the world still feels fake or under-designed

Cloud Park may have cream, coral, ocean-blue, and mint colors, but individual objects still read as sci-fi pods, hard platforms, route discs, or generic debug shapes. In XR this breaks presence quickly because the user reads object silhouettes before they read token intent.

**Cause:** color was changed without changing the shape story. Background sphere clouds, perfect sun discs, imported platform pedestals, box wings, metal materials, and technical rings can all pull the scene back toward "test lab" even when the palette matches.

**Fix:** audit Cloud Park objects by silhouette:

- distant atmosphere should use soft cards and haze, not foreground-like spheres
- selection targets should sit on cloud perches and read as kite, landing pad, and handhold charm
- placement and docking objects should use the beacon seed silhouette, with matching ghost targets
- locomotion cues should read as wind ribbons, route puffs, and stepping clouds
- zen garden should use an organic cloud basin rather than a hard rectangular tray

Keep hitboxes and interaction math unchanged; this is a prop-language pass, not a mechanics rewrite.

### Related project files

- `docs/style-templates/cloud-park.md` — object grammar and lab-set language
- `src/xr/visual/CloudParkScenery.tsx` — shared Cloud Park prop primitives
- `src/labs/cross-xr/SelectionLab.tsx`, `src/labs/ar/PlacementLab.tsx`, `src/labs/vr/LocomotionLab.tsx`, `src/labs/cross-xr/manipulation/` — lab-specific story application

---

## Camera `far` clipping silently truncates faraway geometry

### Symptom: large background object (skydome, distant landmark) renders with a curved or partial silhouette in the desktop preview but looks fine in the headset

The sky shows a "blue circle in the middle, peach surrounding it" or a clearly-bounded oval cap of color, with the boundary tracing a smooth curve across the screen. The boundary moves with camera position. Geometry that *should* fill the whole upper hemisphere (a sphere with `BackSide` rendering) instead reads as a localized dome-shaped region. The desktop preview shows the artifact; the same scene in an immersive WebXR session looks correct.

**Cause:** the camera's far clipping plane is closer to the camera than the geometry is. WebGL/three.js silently discards any fragment whose post-projection NDC z exceeds 1.0 — that's everything beyond `camera.far`. For a mesh that *straddles* the far plane (some triangles within `far`, some past it), the GPU clips the triangles geometrically along the plane, leaving a sliced-open mesh whose visible silhouette is the projection of the far-plane intersection. There is no warning, no console output, and `tsc` cannot detect it because the mismatch is geometric, not type-based.

In this repo, the bug landed when:

- `src/app/App.tsx` instantiates the R3F `<Canvas camera={...}>` with `far: 80` — sensible for the original lab content (3 m arches, 50 m floor, color clear sky).
- `src/xr/visual/Skydome.tsx` later added a sphere of radius 130 m with `side: BackSide`.
- `src/xr/core/DesktopPreviewCamera.tsx` overrides `position`, `up`, `fov`, and the lookAt target on every render but leaves `near` / `far` untouched.

Result: ~75% of the dome's inside surface was past the 80 m far plane and clipped. The visible boundary was the projected ellipse where the far plane intersected the sphere — exactly the curved blue/peach edge users were seeing.

The reason it looked correct in the headset: WebXR overrides the camera's projection matrix entirely with the runtime's own per-eye projection (Meta's near/far come from the headset's lens calibration, not your three.js values). So the desktop preview was the only render path where the stale `far: 80` mattered.

**Fix:** when introducing scene geometry well outside the existing scene radius, update `camera.far` (and consider `near`) to cover it with headroom:

```ts
// In DesktopPreviewCamera.tsx, alongside fov / position / lookAt:
perspective.far = 300 // skydome at 130 m + headroom
perspective.updateProjectionMatrix()
```

A practical rule of thumb on a 24-bit depth buffer: keep `far / near` under ~10,000 to avoid z-fighting in the distance. With `near: 0.1`, that gives you up to `far: 1000` comfortably. We use 300 here.

**How to recognize this class of bug quickly:**

- The "missing" region has a precisely *curved* boundary (an ellipse, not a hard line) — that's the signature of a plane intersecting a sphere/curved surface.
- The boundary changes with camera position but not with scene content — clipping is a frustum property.
- Disabling the suspect material and re-running shows the *whole* mesh disappears uniformly — not a material/shader bug.
- A debug shader that outputs solid color (e.g. `gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0)`) reveals exactly where the geometry *is* drawing, making coverage gaps obvious.

### Related project files

- `src/app/App.tsx` — `<Canvas camera={...}>` initial camera config (sets the default `near` / `far`)
- `src/xr/core/DesktopPreviewCamera.tsx` — per-view overrides applied each render; bump `far` here when adding distant geometry
- `src/xr/visual/Skydome.tsx` — `SKYDOME_RADIUS = 130`; the constant that has to fit inside `camera.far`
- `src/xr/scene/VRScene.tsx` — also sets `<fog>` ranges; fog `far` is independent of camera `far`, but both should agree with the scene scale

---

<!-- Add new ## Section titles below for other domains (e.g. Quest browser, adb reverse). -->
