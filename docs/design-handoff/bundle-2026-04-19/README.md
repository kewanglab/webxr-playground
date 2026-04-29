# XR Playground Design System

A design system for the **XR Interaction Playground** — a cross-XR (VR + AR) interaction-design playground built on `@react-three/xr` v6, `three`, `react-three-fiber`, `drei`, `zustand`, and `leva`. It is a single product (the playground) that hosts many small **labs** — focused experiments comparing interaction patterns (Selection, Placement, Locomotion, Manipulation) across input modes (controller, hand-pinch, direct touch).

This system covers **two co-existing themes** that must both work end-to-end, in 2D shell **and** 3D scene:

- **Warm Night** (`default` / `warm-night`) — restrained, *Her*-inspired warm domestic night. Coral red, dusty salmon, muted blue, cream, off-white, walnut. Quiet screen graphics. Default.
- **Cloud Park** (`cloud-park`) — bright social daytime, Half+Half-inspired. Mint canvas, ocean blue, sunny amber, coral accents, cream panels.

> Both themes share token names and shape — only values differ. The system is enforced via a single `playgroundTheme.ts` source of truth; never introduce parallel hex values.

---

## Sources

| Path | What it is |
|------|------------|
| `scene-polish-bundle/README.md` | Bundle overview & where to start |
| `scene-polish-bundle/design-docs/overview.md` | Stable architecture & conventions |
| `scene-polish-bundle/design-docs/style-templates/shell-2d.md` | 2D HTML/CSS shell spec |
| `scene-polish-bundle/design-docs/style-templates/xr-3d.md` | 3D scene & objects spec |
| `scene-polish-bundle/design-docs/style-templates/cloud-park.md` | Cloud Park preset spec |
| `scene-polish-bundle/code/src/config/playgroundTheme.ts` | Token source-of-truth (warm-night + cloud-park) |
| `scene-polish-bundle/code/src/config/labs.ts` | Lab registry & accent routing |
| `scene-polish-bundle/code/src/xr/hud/HUDPanel.tsx` | Reference HUD geometry |
| `scene-polish-bundle/mockups/*.png` | Layout reference (predates locked palette) |

The bundle was attached read-only via local mount. Reader does not need access — assets you'd need have been copied into this project.

---

## Index

| File | Purpose |
|------|---------|
| `README.md` | This document |
| `colors_and_type.css` | All design tokens (CSS custom props), both themes, semantic styles |
| `SKILL.md` | Agent Skill manifest — invokable in Claude Code |
| `assets/mockups/` | Original layout mockups (predate locked palette) |
| `preview/` | Per-token cards rendered in Design System tab |
| `ui_kits/playground/` | UI kit recreating the desktop shell + in-XR HUD |

---

## Content Fundamentals

The playground is an **internal designer's tool**, not consumer-facing marketing. Voice reflects that.

**Tone.** Quiet, technical, calmly instructive. Sentence-case everywhere. No exclamations, no marketing verbs ("unlock," "supercharge"), no emoji in product copy. The system addresses *the designer running an experiment*, not an audience. Style guide phrases pulled directly from the docs:

- "**Build for comparison, not completeness.**"
- "**Night, not darkness.**"
- "**Warm neutrals first.**"
- "**Treat AR readability and placement as first-class design problems, not later polish.**"

**Voice on labs.** Lab descriptions are imperative or topic phrases, no period. Examples (verbatim from `labs.ts`):

- *Selection Lab* — "Compare selection via ray, direct touch, and hand pinch"
- *Placement Lab* — "Place objects on detected surfaces using hit-test"
- *Locomotion Lab* — "Teleport, smooth movement, and turning systems"

**Casing.** Sentence case for lab names ("Selection Lab", not "SELECTION LAB"). Title case **only** in style-template intent banners. ALL CAPS reserved for the two-letter mode badges: **VR**, **AR**, **CROSS-XR**.

**Pronoun.** Avoid first-person plural in UI ("we", "us"). The docs themselves use "we" liberally — but interface copy stays neutral and tool-like. The user is implied; addressed as "you" only in error/help text when needed.

**Numbers & units.** All metrics carry units inline: `89 FPS`, `11.2 ms`, `0.32 m`, `45°`. Use real Unicode degree (`°`) and prime symbols, not ASCII. Mono font for all numerals in HUD, log, and Leva readouts. Sans for labels.

**Microcopy patterns.**
- HUD section titles: short noun phrase ("Playground HUD", "Trial 2 / 8").
- Method footers: noun phrase, single line ("Hand · Pinch", "Controller · Ray").
- Error/danger uses `state.danger` color and a complete short sentence — not a one-word "Error."

**No emoji.** None in product UI. Inline ✓ / · / ⌄ glyphs only where they appear in the existing HUD code.

**Vibe.** *Quiet, warm, restrained.* The 2D shell reads like a configuration surface from the film *Her* — humanist sans, cream surfaces, walnut text, low-contrast dividers. The 3D scene reads as evening, never as an empty black void. Never neon, never gamer-HUD.

---

## Visual Foundations

### Color
- **One primary accent per theme**: coral red (`shell.accent.primary` = `#B9564E` warm-night, `#D65F55` cloud-park) drives all primary action: Enter VR, active lab chip, focus ring, links.
- **Dusty salmon (warm-night) / sunny amber (cloud-park)** is the support accent; muted blue is rare and reserved for *valid placement / system success*.
- **Warm neutrals first**: backgrounds are cream, off-white, or linen — never pure white. Walnut text, never near-black.
- **Six identity colors** are the only visible identity colors in either theme: coral red, dusty salmon, muted blue, cream, off-white, walnut (warm-night) / sky blue, meadow green, sunny amber, coral, cream, deep teal (cloud-park).
- **Anti-patterns explicitly forbidden**: black-violet voids, neon edges, cold gray HUD plates, bluish-purple gradients, "futuristic" decoration.

### Type
- **Single sans family**: DM Sans (UI/HUD), DM Mono (logs/timestamps/metrics).
- Weights: 400 / 500 / 600 / 700.
- HUD scale (px): FPS expanded `32`, FPS minimized `16`, metric `13.5`, muted `11`, label `9`.
- Shell scale (px): h1 `16/600`, body `12.5/400`, muted `11/400`.
- ALL CAPS only for ≤3-char badges (VR, AR).

### Spacing
- **4px base grid**, with one exception: `space.micro = 2px` for badge insets and icon-to-label hairline gaps.
- Radii follow the same logic: `sm 6 / md 10 / lg 14`. New radii prefer multiples of 4 or 4n+2.
- Prefer **padding over borders**. Group with whitespace before drawing boxes.

### Backgrounds
- **2D shell**: solid warm neutral. No gradients, no images, no textures. Hairline rules at `border.subtle`.
- **3D environment**: gradient skydome (top → horizon → bottom) **as `MeshBasicMaterial`, no shader cost**. Fog tinted to match horizon. Floor is one warm `MeshStandardMaterial` with low emissive lift.
- No raster textures, no skybox cubemaps, no environment maps.

### Animation & Motion
- **Shell**: 120–180 ms ease-out (`cubic-bezier(0.4, 0, 0.2, 1)`) on hover/focus color. Avoid sliding animations. Respect `prefers-reduced-motion`.
- **XR**: no per-frame material allocation. Pulses use opacity oscillation (e.g. inner ring at 1.2 Hz ±15% opacity for targeted orb). Confirm animations resolve in ≤400 ms.
- **No bounces, no springs**, no decorative motion. Cloud Park optionally allows one or two distant cloud groups to drift; never near-field props.

### Hover / Press
- **Hover**: shift to next-darker accent (e.g. `accent.primary` → `accent.primaryHover`), or surface from canvas → elevated. *Never* opacity-only.
- **Press**: same color shift; no transform/scale for accessibility & XR readability.
- **HUD hover**: opacity rises from 0.5 (idle) to 1.0 (hovered) — defined for the in-XR panel where pointer hover is meaningful.

### Borders
- 1px `border.subtle` for all hairlines — dividers, panel edges, inactive chips.
- 1px `border.default` only on resting interactive elements (buttons, chips with stronger weight).
- No double borders. No drop shadows on inputs.

### Shadows
- Single soft layer: `0 1px 0 shadow.soft` for panels.
- Heavier elevation only on the in-XR HUD: `0 6px 28px rgba(0,0,0,.5)` — that panel floats in a 3D scene and needs explicit elevation.
- No inner shadows.

### Transparency / Blur
- HUD panel uses **opacity, not backdrop blur** — Quest GPU budget can't afford it.
- Translucent walnut glass at 0.70 opacity (warm-night) / cream at 0.78 (cloud-park).
- AR overlay strokes at `0.42` (warm-night) / `0.48` (cloud-park) — slightly more visible against passthrough.

### Corner Radii
- 6 / 10 / 14. Pill-shape (full radius) only for badges and the minimized HUD pill (`19px` — half of 38px height).
- Cards use `radius.lg` (14px). Buttons & chips use `radius.md` (10px). Inputs `radius.sm` (6px).

### Cards
- Background: `bg.elevated`. Border: 1px `border.subtle`. Radius: `radius.lg`. Shadow: single soft layer.
- Optional bottom-hairline title bar.
- **No colored left-border accents.** That's an explicit anti-pattern in this system.

### Imagery
- Mockups are warm cream/walnut — no photographic imagery in the product itself.
- For decks/presentations, use real photo references from *Her* (warm domestic interiors, low light, walnut, cream, salmon) or *Half+Half* (open daytime sky, soft clouds, meadow). Treat as mood only — never reproduce assets.
- All imagery skews **warm**, never cool, never b&w, never high-grain.

### Layout Rules
- **Bottom-fixed shell bar** holds Session controls + Experiments tabs.
- Leva floats top-right at fixed width (`460px`).
- In-XR HUD floats lower-left of FOV via TagAlongHUD; offset ≈ 0.9 m forward.
- Canvas occupies the full viewport above the shell bar.

---

## Iconography

The playground deliberately avoids decorative iconography. The shell ships almost no icons — *minimal iconography* is one of the explicit principles.

- **No icon font, no SVG sprite, no per-component icon library** in the codebase. Iconography that does appear is hand-drawn inline as drei `<Text>` glyphs (e.g. the `⌄` chevron in `HUDPanel.tsx`).
- **Unicode symbols where icons are absolutely required**: `⌄` (collapse chevron), `·` (mid-dot separator in mode lines), `→` (arrow in mockups), `°` and `′` for angle/distance metrics. These are typed inline, not iconified.
- **No emoji.** Anywhere. In product UI or copy. The brief explicitly states emoji are not part of this brand.
- **Mode badges are typographic, not iconic.** "VR", "AR", "CROSS-XR" set in DM Sans 500/uppercase inside a pill — never paired with a headset icon.
- **In-XR shapes serve as iconography**: a coral plinth means *interactive object*. A muted-blue thin ring means *valid placement*. A dusty-salmon rim means *targeted but not yet confirmed*. Shape and color carry the semantic load icons would normally carry.

**If a future icon is added** (e.g. an entry point, a settings cog), follow the closest CDN match at the same restraint level: Lucide's `regular` weight (1.5px stroke) translates well. The system would then pull from Lucide via CDN, no local sprite. **No Lucide icons are currently present** — flagged as a substitution if you reach for one. Document the addition here when it ships.

---

## Caveats / Substitutions

- **Fonts**: `playgroundTheme.ts` declares `"DM Sans"` and `"DM Mono"` in `TYPOGRAPHY`, but the runtime `ShellTheme.font` strings still use system stacks (`ui-sans-serif`, `ui-monospace`). The TYPOGRAPHY block is documented as "Not yet applied to existing UI — reserved for Phase 2+." This system pulls **DM Sans + DM Mono from Google Fonts** per the canonical spec; if you need offline-only fonts, drop the `.woff2` files into `fonts/` and switch `colors_and_type.css` to `@font-face`. Flagged.
- **Mockups predate the locked palette.** The PNGs in `assets/mockups/` are dark/cool — treat them as layout references only. The token files in this system are the source of truth.
- **No real product logo provided.** None exists in the bundle. The wordmark in `preview/Brand-Wordmark.html` is a typographic placeholder (DM Sans 600). Replace when a real mark ships.
- **Cloud Park scenery code (`CloudParkScenery.tsx`) was not read in full** — palette is taken from the spec doc and `playgroundTheme.ts`, not from the runtime mesh code.

---

**This system is opinionated about what to *not* do.** When in doubt, lean quiet, lean warm, lean low-contrast.
