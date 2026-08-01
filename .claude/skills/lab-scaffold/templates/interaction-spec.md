# <Lab Name> — interaction spec

> Produced by the lab-scaffold skill. Reviewed and approved by a human before
> any code was written. Values marked `(assumed)` were chosen by the agent, not
> stated by the source — edit freely.

## Core interaction question

<One sentence, in the lab-description register: what does this lab let you feel or measure?>

## Source

- **Mode:** paper | idea
- **Paper:** <full citation + link> — or —
- **Idea (verbatim):** "<the user's original sentence>"
- **Related work:** <optional; techniques this resembles, and whether their parameter ranges were adopted>

## Mode & staging

- **XR mode:** vr | ar | cross-xr — <one line on why>
- **Staging vocabulary:** <pedestals + objects / ghost preview + ring / … — reuse one from the design skill §7 or name a new one>
- **Accent pair:** <primary / secondary from `labAccents` or `xr.accent.*`>

## Techniques / conditions

| Condition | What the user does | WebXR mapping (pointer type / joints / gamepad) | Feasibility |
|---|---|---|---|
| <name> | <behavior> | <e.g. ray pointer + selectstart; thumb-tip joint> | ok / approximated: <how> / cut |

Scope cuts: <what is deliberately not implemented, and why — unavailable sensing, out of scope, deferred>

## Parameters (→ Leva schema, verbatim)

| Param | Default | Min | Max | Step | Unit | Notes |
|---|---|---|---|---|---|---|
| <camelCase> | <n> | <n> | <n> | <n> | <m/s/°/×> | <source page/section, or `(assumed)`> |

## Measures (→ HUD cells + logTrialResult)

- <measure, unit, when it's captured> — or —
- **none** (freeform feel lab)
- Paper mode: include the paper's **time measures** (completion time, acquisition time) — the trial runner marks trial start, and acquisition callbacks exist; omitting them is the most common fidelity gap.

## Trial protocol (omit for freeform labs)

- Conditions × repetitions: <e.g. 2 techniques × 6 targets = 12 trials>
- Difficulty levels: <if the paper varies task difficulty, list every level — headline findings often live only in the hardest ones>
- Target presentation: <how the goal is shown — static ghost / animated from start pose / …>
- Reset rule: <what re-seeds between trials>
- Trial advance: <on release / on confirm / timed>, feedback hold <n> ms

## Human test card

*(Filled in at Stage 3 hand-off.)*

- [ ] <idea mode: the idea's success statement, verbatim>
- [ ] Works with controllers and with hands (or subtitle states the scoping)
- [ ] <concrete headset checks: comfort, tracking recovery, feel>

## Implementation status

*(Updated at hand-off: files, deviations from this spec, surviving assumptions.)*
