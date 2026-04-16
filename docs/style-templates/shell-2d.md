# Style template: Shell (2D UI)

**Intent:** Calm, warm configuration surfaces that feel **human and spacious**—in the spirit of *Her*: coral red, dusty salmon, muted blue, cream, off-white, walnut, and low visual noise. This template covers **everything drawn with HTML/CSS** over the canvas (playground chrome, Leva, logger, future theme picker).

**Out of scope:** Three.js materials and world lighting (see [xr-3d.md](./xr-3d.md)).

---

## Inspiration

**Fictional and cultural references** are **mood guides only**—palette, typography, shape language—not likenesses, franchise assets, or literal UI copies.

### Film / culture: *Her*

The **web page and configuration surfaces** (Leva, playground chrome, logger) lean *Her*-like:

- Warm, quiet, **human** interface: cream/off-white grounds, walnut text, coral red actions, dusty salmon grouping, and restrained muted blue system states.
- **Lots of breathing room**, soft radii, low-contrast dividers, **humanist sans** for labels; interactions feel calm and legible, not “gamer HUD.”
- Buttons and chips: flat panels, thin rules, roomy margins, soft grouping, minimal iconography, and almost no visual noise.

### Where the rest of the product lives

In-headset worlds, HUD chrome, and lab props follow **[xr-3d.md](./xr-3d.md)** as the same restrained warm identity translated into 3D. Cross-cutting execution plan: [spatial polish plan](../spatial-polish-plan.md).

---

## Theme object shape (code)

**Recommendation:** In `playgroundTheme`, put **all** 2D shell tokens—colors, type stacks, spacing, and radii—under a single **`shell`** object. That gives one mental model (“everything for HTML/CSS overlays”) and one `applyShellToCss(shell)` (or equivalent) that can emit variables for colors **and** for spacing/radius.

```ts
// Conceptual shape (names match tables below)
type PlaygroundPreset = {
  id: string
  shell: {
    bg: { canvas: string; elevated: string; subtle: string }
    border: { subtle: string; default: string }
    text: { primary: string; muted: string; inverse: string }
    accent: { primary: string; primaryHover: string; soft: string }
    focus: { ring: string }
    state: { success: string; warning: string; danger: string }
    shadow: { soft: string }
    overlay: { scrim: string }
    font: { ui: string; mono: string } // stacks from Typography
    space: { micro: number; xs: number; sm: number; md: number; lg: number; xl: number; xxl: number } // px; see Spacing & layout
    radius: { sm: number; md: number; lg: number } // px
  }
  xr: { /* see xr-3d.md */ }
}
```

**CSS variables:** Map with a consistent prefix, e.g. `--pg-shell-bg-canvas`, …, `--pg-shell-space-micro`, `--pg-shell-space-md`, `--pg-shell-space-xxl`, `--pg-shell-radius-lg`. Components use `var(--pg-shell-space-*)` instead of raw pixels.

**Why not top-level `space` / `radius`?** You can do `preset.space` as a sibling of `preset.shell`, but then “what applies to the page?” is split across two keys. Nesting under `shell` keeps presets cohesive and avoids orphan keys.

**Answers you do *not* need to give for v1:** Spacing and radius can stay **identical across future presets**; only copy the `shell.space` / `shell.radius` objects if a preset ever needs a denser UI.

---

## Principles

1. **Warm neutrals first** — backgrounds read as cream, off-white, or linen, not pure white or cold gray.
2. **One primary accent** — coral red for actions and selection; dusty salmon is support, muted blue is rare.
3. **Breathing room** — prefer padding over borders; group with spacing before drawing boxes.
4. **Hairline structure** — dividers at low contrast; reserve strong contrast for text and primary buttons.
5. **Readable type** — humanist sans for UI; monospace only for logs, codes, and timestamps.
6. **Spacing grid** — layout spacing uses **multiples of 4px** (`4, 8, 12, 16, 20, 24, …`). The only smaller step is **`shell.space.micro` (2px)** for tight insets (badges, icon-to-label hairline gaps). Do not use off-grid values (e.g. 18px); pick the nearest token.

---

## Default palette (semantic tokens)

Use these as the **`shell`** object in `playgroundTheme` and as **CSS custom properties** on `:root`. Names are stable; hex values may shift slightly during implementation if contrast fails WCAG AA.

| Token | Default | Usage |
|-------|---------|--------|
| `shell.bg.canvas` | `#F0E3D4` | Cream page/canvas surround |
| `shell.bg.elevated` | `#FBF7EF` | Off-white panels, Leva root, logger cards |
| `shell.bg.subtle` | `#E8D7CA` | Soft grouping regions, inactive chip fill |
| `shell.border.subtle` | `#D3BCAC` | Thin rules, dividers, inactive outlines |
| `shell.border.default` | `#B99B89` | Resting button/chip borders |
| `shell.text.primary` | `#3A2820` | Walnut body labels, titles |
| `shell.text.muted` | `#6B5A50` | Secondary descriptions, hints |
| `shell.text.inverse` | `#FFF7EF` | Text on solid coral buttons |
| `shell.accent.primary` | `#B9564E` | Coral red primary actions, active lab chip, links |
| `shell.accent.primaryHover` | `#97463F` | Hover / pressed coral |
| `shell.accent.soft` | `#DEA199` | Dusty salmon fills and focus halo support |
| `shell.focus.ring` | `#B9564E` | Focus-visible outline (2px) + 2px offset |
| `shell.state.success` | `#6F8792` | Sync OK, positive badges, muted blue system success |
| `shell.state.warning` | `#9C6B4E` | Non-destructive warnings |
| `shell.state.danger` | `#8F3C37` | Destructive or error, restrained coral-brown |
| `shell.shadow.soft` | `rgba(58, 40, 32, 0.08)` | Panel elevation shadow |
| `shell.overlay.scrim` | `rgba(58, 40, 32, 0.35)` | Modal / emphasis scrim (rare) |

**Contrast checks:** Pair `text.primary` on `bg.elevated` and `accent.primary` on `text.inverse` for AA where those combinations appear.

---

## Typography

| Role | Font stack | Weight | Size (px) | Line height | Letter-spacing |
|------|------------|--------|-----------|-------------|----------------|
| UI title | `ui-sans-serif, "SF Pro Text", "Segoe UI", system-ui, sans-serif` | 600 | 15–16 | 1.35 | normal |
| UI body | same | 400 | 14 | 1.45 | normal |
| UI small / captions | same | 400 | 12–13 | 1.4 | +0.01em optional |
| Mono / log | `ui-monospace, "SF Mono", "Cascadia Code", monospace` | 400 | 12 | 1.5 | normal |

**Rules**

- Avoid all-caps except short badges (`VR`, `AR`); use sentence case for lab names.
- Logger and technical readouts use **mono** only in those regions.

---

## Spacing & layout

**Grid rule:** Every layout spacing value is either **`shell.space.micro` (2px)** or a **multiple of 4px**. No other pixel steps (e.g. 6px, 10px, 18px) for margin/padding/gap unless they come from this table.

| Token | Value | Usage |
|-------|-------|--------|
| `shell.space.micro` | **2px** | Smallest inset only: badge padding (narrow axis), icon-to-label hairline gap, paired with focus ring width where spec calls for 2px |
| `shell.space.xs` | 4px | Tight icon gaps |
| `shell.space.sm` | 8px | Inline control gaps; shell bar horizontal gap between controls |
| `shell.space.md` | 12px | Default vertical padding on buttons |
| `shell.space.lg` | 16px | Section padding, Leva row breathing room |
| `shell.space.xl` | 20px | Wider horizontal padding on primary actions |
| `shell.space.xxl` | 24px | Between major groups (Session vs Experiments) |

### Corner radii (separate from spacing)

Radii are not “gaps”; defaults below stay as specified. If you add new radii, prefer **multiples of 4px** or **4n + 2** for slightly softer corners (e.g. 6, 10, 14).

| Token | Value | Usage |
|-------|-------|--------|
| `shell.radius.sm` | 6px | Small inputs |
| `shell.radius.md` | 10px | Buttons, chips |
| `shell.radius.lg` | 14px | Floating panels (Leva, logger) |

**Shell bar (playground chrome):** bottom-fixed bar; min height comfortable for mouse; if targets must work on touch tablets, keep interactive height **≥ 40px** (multiple of 4) and horizontal gap **`shell.space.sm` (8px)** or larger.

---

## Components

### Primary button (e.g. Enter VR / AR when enabled)

- Background: `shell.accent.primary`; text: `shell.text.inverse`.
- Border: none or 1px `shell.accent.primaryHover`.
- Radius: `shell.radius.md`; padding: `shell.space.md` vertical, `shell.space.xl` horizontal (12px × 20px — on the 4px grid).
- Hover: background `shell.accent.primaryHover`.
- Disabled: `shell.bg.subtle`, `shell.text.muted`, `shell.border.subtle`, `cursor: not-allowed`, no shadow.

### Secondary / ghost (lab chips inactive)

- Background: transparent or `shell.bg.subtle`.
- Border: 1px `shell.border.default`.
- Text: `shell.text.primary`.
- Hover: background `shell.bg.elevated`, border `shell.border.subtle`.

### Active chip (current lab)

- Background: `shell.accent.soft` or light tint of `shell.accent.primary` at ~15% opacity.
- Border: 1px `shell.accent.primary`.
- Text: `shell.text.primary`; optional **600** weight.

### Badges (mode: `cross-xr`, `VR`, `AR`)

- Pill radius: full; padding `shell.space.micro` × `shell.space.sm` (2px × 8px).
- Background: `shell.bg.subtle`; border `shell.border.subtle`; text `shell.text.muted` or `shell.text.primary` at small size.

### Panels (Leva, logger)

- Background: `shell.bg.elevated`; border: 1px `shell.border.subtle`.
- Radius: `shell.radius.lg`; shadow: soft single layer from `shell.shadow.soft`.
- Internal title bar: optional hairline bottom `border.subtle`.

### Focus

- All focusable controls: visible `shell.focus.ring` outline; no removal of outline without replacement.

---

## Motion

- Duration: **120–180ms** for hover/focus color transitions.
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (standard ease-out).
- Avoid large sliding animations on the shell; respect `prefers-reduced-motion`.

---

## Leva mapping (implementation hint)

Map Leva `theme` colors to **`shell.*`** tokens so the panel feels native:

- Panel background → `shell.bg.elevated`
- Control background → `shell.bg.subtle` or canvas blend
- Border → `shell.border.subtle`
- Label text → `shell.text.muted`; value text → `shell.text.primary`
- Accent / modified highlight → `shell.accent.primary` or `shell.accent.soft`
- Row height / gaps → derive from `shell.space.*` where Leva allows sizing overrides

See [Pitfalls](../pitfalls.md) before customizing Leva plugins.

---

## Future presets

Future day or accessibility presets should preserve the same quiet component grammar unless the product direction explicitly changes: flat panels, thin rules, roomy margins, soft grouping, minimal iconography, and restrained accents.

---

## Checklist (design QA)

- [ ] Primary on elevated background meets **AA** for body text sizes.
- [ ] Focus states visible on all interactive elements.
- [ ] Disabled session buttons are obviously inactive without relying on color alone (paired with label or opacity).
- [ ] Leva panel does not use colder grays than the shell unless intentional.
