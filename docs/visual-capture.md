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

## Cloud Park Beauty Review

Cloud Park captures should be judged as scenic compositions, not just QA proofs.

A passing Cloud Park hero frame should show:

- a clear foreground, midground, and horizon layer
- visible atmospheric detail such as painterly cloud cards, sunlight haze, wind lines, distant silhouettes, or flecks
- lab props that feel like part of a sky park, not recolored debug geometry or sci-fi kit pieces
- object silhouettes that explain the lab story: kite pointer, cloud landing pad, handhold charm, beacon seed, wind route, sky workbench, or cloud-garden basin
- a quiet grid that supports spatial reading without becoming the subject
- all required interaction objects framed without cropping

For Placement Lab, desktop `capture=scene` shows a Cloud Park surface-marker showcase. Immersive AR still uses the real hit-test placement flow and should stay passthrough-safe.

When Cloud Park looks flat, check shape before color. A hard circular sun, background sphere-puff clouds, kit pedestals, boxy pods, or technical route discs can make the scene read like a decorated lab even when the palette is correct.

## Iterating On Camera Angles

When tuning a camera view, do not review only an overwritten PNG. Copy the candidate frame to a unique filename before sharing or comparing it, for example:

```bash
cp docs/mockups/captures/scenes/cloud-park/selection-overhead.png \
  docs/mockups/captures/scenes/cloud-park/selection-overhead-mat-center-orthographic.png
```

Use a name that describes the design intent, not just the timestamp. Good examples:

- `selection-overhead-mat-center-orthographic.png`
- `selection-overhead-hero-axis-wide-fit.png`
- `locomotion-overhead-full-path.png`

This keeps review honest. If the screenshot viewer caches an old image, or if a capture command silently overwrites a previous attempt, a unique filename makes it obvious which camera version is under discussion.

## Guardrails

- Scene capture uses `preserveDrawingBuffer` only during capture mode so normal runtime performance stays unchanged.
- Screenshots are desktop approximations, not headset validation. Use them for composition, palette, and layout review; still validate comfort and readability on Quest.
- Keep camera views authored in `src/xr/core/DesktopPreviewCamera.tsx` so every lab has deliberate review angles instead of arbitrary browser camera drift.
- For strict overhead reviews, prefer an orthographic camera with explicit rotation over a high perspective camera using `lookAt`.
- Check ground-grid alignment: if grid lines meant to be horizontal/vertical are not parallel to the image edges, the capture is not a true plan view.
- For Cloud Park, do not let QA helpers dominate beauty frames; scenic atmosphere and lab object polish should be visible before the grid is noticed.
