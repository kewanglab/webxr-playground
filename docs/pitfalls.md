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

<!-- Add new ## Section titles below for other domains (e.g. WebXR session, Quest browser, adb reverse). -->
