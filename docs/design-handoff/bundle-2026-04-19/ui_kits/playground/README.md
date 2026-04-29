# UI Kit · XR Playground

Recreates the **desktop playground shell** + a representative slice of the **in-XR scene** at 1280 px wide.

## Components

| File | Role |
|------|------|
| `App.jsx` | Composes the whole view; lab + theme + HUD state |
| `Button.jsx` | Primary / ghost / disabled / focused button |
| `LabChip.jsx` | Active / inactive lab selector chip (used in shell bar) |
| `Badge.jsx` | VR / AR / CROSS-XR mode badge or state tag |
| `HUDPanel.jsx` | Minimized pill (auto-w × 38) ↔ expanded 295×168 metrics panel |
| `LevaPanel.jsx` | Tuning panel with stepper + slider rows |
| `styles.css` | Layout-only rules; tokens come from `colors_and_type.css` |

## Demo behavior

- **Theme toggle** (right side of shell bar) flips `data-pg-theme` between `warm-night` and `cloud-park`. All tokens swap atomically.
- **Lab chips** in the shell bar swap the lab heading, description, mode badge, and the method footer in the HUD.
- **HUD panel** click expands / collapses between pill and full panel.
- **Leva sliders** (steppers) update local tuning state; values format with DM Mono.

## What the kit shows about the system

- Bottom-fixed shell on a dark canvas chrome, with a subtitle "lab line" between canvas and shell.
- HUD floats lower-left of the canvas; Leva floats top-right — matching `overview.md` placement guidance.
- Pedestal + object pattern from `mockups/05-lab-stages-overview.png`.
- Per-method object tints (coral / amber / stone) follow the Selection Lab accent routing.

## What's intentionally faked

- The "3D scene" is CSS gradients + a perspective-warped grid div. The real product runs `react-three/fiber`.
- HUD geometry is approximate: the production `HUDPanel.tsx` uses drei `Text` with `outlineWidth` and a `roundedRectShape` mesh. CSS box-shadow approximates the spec's bloom.
- Leva is hand-rolled; production uses the actual `leva` library themed via `levaThemeFromShell()` in `playgroundTheme.ts`.
