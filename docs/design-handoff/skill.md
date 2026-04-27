# SKILL.md — Designing for the XR Playground

How to design new screens, components, and experiments inside this design system. Read top-to-bottom before producing anything.

---

## 1. Two themes, never anything else

Every design must commit to either `data-pg-theme="warm-night"` or `data-pg-theme="cloud-park"`. Wrap your root element in the attribute and pull values from `colors_and_type.css` — never hand-pick hex codes.

| | warm-night | cloud-park |
|---|---|---|
| Mood | dusk · fireside · indoors | overcast park · daylight |
| Shell text on bg | `#3A2820` on `#FBF7EF` | `#1F3F45` on `#F8FBED` |
| Primary action | coral `#B9564E` | coral `#D86F66` |
| Canvas dome | terracotta + slate | sky blue + warm haze |
| FPS metric | salmon `#DEA199` | sage `#7BB28A` |

If a design needs both themes, build one and toggle. Don't show side-by-side unless the comparison itself is the point.

## 2. Where things live

The product has exactly two surface families:

**Shell** — cream cards, walnut text, light borders. Used for: bottom shell bar, Leva panels, settings, the desktop framing around the canvas. Lives at HTML/CSS in real DOM. High contrast (≥ 4.5:1).

**Canvas / XR HUD** — translucent panels (`rgba(81,68,62,0.78)`), coral 1.4 px borders, drop-shadow bloom. Used for: the FPS pill, expanded HUD panel, in-XR labels. Lives in three.js / drei `<Text>` in production. CSS approximates with `filter: drop-shadow(0 6px 28px rgba(0,0,0,.5))`.

Don't mix surface languages within one panel. A Leva-style settings panel placed inside the canvas should still be a **shell** card — Leva gets a glassy outline only because three.js renders it onto the scene, not because the design language inverted.

## 3. Type rules

- **Two faces only:** DM Sans (UI) and DM Mono (numerals, log entries, metric labels).
- **Numerals are always DM Mono** with `font-variant-numeric: tabular-nums`. FPS, distances, errors, counts, timestamps. Never DM Sans.
- **HUD labels** are `9 px / 0.04em / uppercase` in `--pg-xr-hud-text-muted`. They never grow above 10 px.
- **Shell labels** are `9.5–10 px / 0.08em / uppercase`. Section labels in the shell bar follow this exactly.
- **Body / paragraph text** doesn't really exist in this product. If you have more than two lines of running prose, you're probably building a page that doesn't belong here.

## 4. Spacing & sizing

- **4 px grid**, with a 2 px micro step reserved for inside HUD pills and badges.
- **Radius**: 6 (chips/inputs), 10 (buttons/Leva rows), 13 (HUD panel), 14 (shell cards), 19 (HUD pill — half its 38 px height), 999 (badges).
- **Stroke**: 1 px shell, 1.4 px HUD coral border, 1.5 px slider thumb. Never thicker.
- **HUD panel canonical sizes**: pill auto-width × 38 (hugs `dot · number`), expanded 295×168. Memorize the height — it repeats across labs.
- **Leva rows**: 48 px tall, label 130 px wide, slider track 6 px tall, thumb 14 px.

## 5. Mode communication

A lab can run in VR, AR, or **CROSS-XR** (works in both). Communicate the mode by **text badge**, never by icon:

```html
<span class="badge">CROSS-XR</span>
```

Badges are uppercase, 9.5 px, pill radius. Color is neutral by default; `coral` if the badge is itself the active state, `cyan` for success/sync, `amber` for "currently targeted." See `preview/components-badges.html`.

## 6. Iconography (or rather, no icons)

There is no icon font, no SVG sprite, no Lucide / Heroicons. State and action are communicated by:

- typography (mode badges)
- color (orb states: dusty salmon → coral → cream-gold)
- shape (HUD pill vs. expanded panel)
- motion (`outlineWidth` pulse on confirmed selection)

Allowed inline glyphs: `⌄ · → ° ′ ✓`. Anything else, ask before adding. **No emoji.**

## 7. Building a new lab

A new lab needs five things, in this order:

1. **A name** in title-case ending in "Lab": `Manipulation Lab`.
2. **A mode**: VR, AR, or CROSS-XR.
3. **A one-sentence description** ≤ 9 words, present-tense, parallel to existing labs ("Compare selection via ray, direct touch, and hand pinch").
4. **A staging vocabulary** — pedestals + objects, floor chevrons + monolith, ghost preview + ring, hero object + gizmo. Reuse one from `preview/brand-lab-stages.html` or invent one and document it back.
5. **An accent pair** — one primary `--pg-xr-accent-*` for the lab's headline object, one secondary for supporting geometry. Use `playgroundTheme.ts` accent names: `orange`, `amber`, `mustard`, `stone`, `walnut`, `seal`.

Then drop a `LabChip` in the shell bar and a `LevaPanel` for tuning. The `lab-line` between canvas and shell shows `{name} · {mode.toLowerCase()}`.

## 8. Tuning panels (Leva)

Every lab has 2–6 tunable parameters. Leva conventions:

- **Sliders for continuous values** with tasteful `min`/`max`/`step`. Always show numeric value in DM Mono.
- **Toggles for binary feature flags** ("enable haptics", "show metrics overlay").
- **Dropdowns when a value is genuinely categorical** ("interaction method: ray | pinch | touch").
- Group label names use the same lowercase+space style as Leva itself: `target size`, `confirm boost`, `hover delay`. **Never** `targetSize` or `Target Size`.

## 9. HUD panel composition

The HUD has three states: **hidden** (during onboarding), **minimized pill** (always), **expanded** (focus mode). Always:

- top-left: FPS dot + number, color-graded (≥90 sage, 72–89 mustard, 45–71 dusty-orange, < 45 coral).
- top-right: trial counter + interaction method (one line, two lines stacked).
- middle: 4 metric cells max. Pick metrics specific to the lab (HIT/ERR for selection; DIST/STEPS for locomotion; TILT/ROLL for manipulation).
- footer: highlighted method tag, full width, coral wash.

If you need more than 4 metrics, you're designing a results page, not a HUD — break out into a separate shell-language report.

## 10. Copywriting tone

- Direct, technical, unsugared. "Enter VR" not "Begin your immersive journey."
- Lab descriptions read like research-paper abstracts, one sentence.
- Method names like a spec: "Hand · Pinch", "Controller · Ray", "Gaze · Dwell". Mid-dot separator.
- Numbers always carry units inline: `0.28m`, `3.4°`, `11.2ms`. Never bare floats in user-facing text.
- No marketing voice. No exclamation marks. No "✨" anywhere.

## 11. Process

When asked to design something for this system:

1. Decide which theme (warm-night unless told otherwise — it's the canonical one).
2. Decide shell-surface vs. HUD-surface.
3. Use existing components from `ui_kits/playground/` when possible. Wrap them in a new layout rather than reinventing.
4. Pull all colors and typography from `colors_and_type.css`. If you need a value not in the file, ask before introducing it.
5. Stage your design at the canonical viewport (1280×800 desktop, or 1920×1080 if shown alongside the running canvas).
6. If exposing variations, do it via Tweaks toggling state in one document — never multiple HTML files for "v1 / v2 / v3".
