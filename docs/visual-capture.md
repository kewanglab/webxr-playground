# Visual capture workflow

## What It Is

This workflow uses Playwright to open the playground in Chromium and save repeatable screenshots into `docs/mockups/captures/`.

There are two kinds of captures:

- **UI captures** show the desktop shell, lab controls, appearance dock, Leva panel, and logger.
- **Scene captures** hide the desktop shell and photograph only the Three.js canvas from an authored camera angle.

## Why It Matters

XR design review needs more than one flat screenshot. A 2D page screenshot tells us whether the shell is readable, but a scene screenshot tells us whether the body has a clear place to stand, whether objects are staged at a comfortable distance, and whether color is doing useful spatial work.

Compared with normal 2D design QA, the camera matters. In XR, a theme can look good head-on but fail from the side if anchors, panels, or pathways lose their relationship to the user.

## How To Think About It

Think of Playwright as a repeatable camera operator:

- `capture=ui` is the product-design review shot.
- `capture=scene` is the in-world spatial composition shot.
- `captureView=hero` is the default presentation angle.
- `captureView=side` checks depth and reach.
- `captureView=overhead` checks layout, spacing, and path structure.
- `captureView=wide` checks environmental read and horizon comfort.

## Commands

Install the browser binary once after installing dependencies:

```bash
npx playwright install chromium
```

Capture the current screenshot set:

```bash
npm run capture:screenshots
```

Run all visual Playwright specs:

```bash
npm run test:visual
```

## URL Controls

These query parameters are useful for manual review and for Playwright:

| Parameter | Values | Purpose |
|-----------|--------|---------|
| `theme` | `default`, `cloud-park` | Selects the theme preset. |
| `lab` | `selection`, `placement`, `locomotion`, `manipulation` | Opens a lab directly. |
| `capture` | `ui`, `scene` | Hides noisy overlays for scene captures; keeps shell for UI captures. |
| `captureView` | `hero`, `side`, `overhead`, `wide` | Selects the desktop camera angle for scene captures. |

Example:

```text
http://127.0.0.1:5175/?theme=cloud-park&lab=selection&capture=scene&captureView=side
```

## Current Capture Set

`npm run capture:screenshots` writes:

- `docs/mockups/captures/ui/default-selection-shell.png`
- `docs/mockups/captures/ui/cloud-park-selection-shell.png`
- `docs/mockups/captures/scenes/cloud-park/<lab>-hero.png` for each lab
- `docs/mockups/captures/scenes/cloud-park/selection-side.png`
- `docs/mockups/captures/scenes/cloud-park/selection-overhead.png`
- `docs/mockups/captures/scenes/cloud-park/selection-wide.png`

## Guardrails

- Scene capture uses `preserveDrawingBuffer` only during capture mode so normal runtime performance stays unchanged.
- Screenshots are desktop approximations, not headset validation. Use them for composition, palette, and layout review; still validate comfort and readability on Quest.
- Keep camera views authored in `src/xr/core/DesktopPreviewCamera.tsx` so every lab has deliberate review angles instead of arbitrary browser camera drift.
