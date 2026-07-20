# Plan: the lab-scaffold skill (paper → lab, idea → lab)

> **Status (2026-07-19):** M0 landed (`useTrialRunner` + `logTrialResult` in
> `src/xr/interactions/evaluation/`, DockingMode rewired through them,
> `src/labs/_template/TemplateLab.tsx` as the reference contract) and the skill
> is authored at `.claude/skills/lab-scaffold/`. Next: M1 calibration run
> against the Mikkelsen DOF-separation PDF, then M2.

The agentic-harness milestone from [Roadmap](./roadmap.md) and [Vision](./vision.md): a Claude Code skill that takes **any interaction concept** — a research paper (PDF, arXiv/DOI link, citation) *or* a napkin idea described in a few sentences — and scaffolds a working lab: registry entry, component, Leva controls, measurement hooks, HUD report, session-logger integration. The human spends their time on the interaction question, not the plumbing.

The existing `docs/design-handoff/skill.md` covers *visual* design inside the system; this skill covers *interaction scaffolding*. They are complementary and the lab skill should reference the design skill for staging/tokens.

## Why this is the right flagship

The repo's thesis is "AI as the authoring layer" (README Commitment 3) and its audience promise is "anyone with an opinion about how XR should feel" (Vision). Today those are claims; this skill makes them demonstrable in both registers:

- *"I read this paper this morning, let me try it on Quest tonight."* (researcher)
- *"What if grab strength controlled rotation speed? Let me feel it after lunch."* (designer with an idea and no R3F fluency)

The strongest possible portfolio artifact is a recorded run of each.

## One pipeline, two entry modes

Papers and ideas converge on the same artifact: a structured **interaction spec**. Everything downstream of the spec (scaffold → implement → verify) is identical. The only difference is how the spec gets filled in:

- **Paper mode** — the skill *extracts* the spec from the source: the paper states the techniques, parameters, and measures; the skill's job is faithful translation plus a WebXR feasibility check.
- **Idea mode** — the skill *co-authors* the spec through a short structured interview. Ideas arrive underspecified ("selection should feel stickier near targets"), so the skill asks the 3–5 questions needed to fill the same template — which behavior domain is this (select / grab / place / locomote / menu)? what varies (the conditions)? what should be tunable, with plausible ranges? what would tell you it works (measures, or explicitly "feel only")? It proposes defaults for everything else rather than interrogating; the human edits the draft spec, not a blank page. A related-work nudge ("this resembles bubble-cursor / Go-Go — want the paper's parameter ranges as defaults?") connects idea mode back to the literature without requiring it.

The spec template is deliberately tolerant: an idea-mode lab may have `measures: none (freeform feel lab)` and no trial protocol — that's a valid lab (Zen Garden is the in-repo precedent). Every field the two modes share means techniques from papers and techniques from ideas end up A/B-comparable in the same harness — which is the mix-and-match bet of the whole playground.

## Prerequisite refactors (M0)

The skill is only as reliable as the contracts it targets. Three small extractions make the scaffold mechanical instead of interpretive:

1. **`useTrialRunner`** — lift DockingMode's trial machinery (trial list, index, per-trial measures, completion state, restart) into `src/xr/interactions/evaluation/useTrialRunner.ts` with a typed `TrialSpec` / `TrialMeasure` contract. Fix the snap/reset bugs (repo review #1–2) during extraction. This is also the first Phase-5 "graduated primitive."
2. **Results persistence** — a `logTrialResult()` helper that writes structured trial results (lab, technique, condition, measures) to the session log / `/api/logs`, so every scaffolded lab gets data capture for free.
3. **A reference lab template** — `docs/templates/lab-template.tsx` (or a heavily-commented minimal lab in-tree): LabHeading + theme tokens + Leva group + `useHudReport` + optional trial runner + both-input-modes checklist as comments. The skill copies and fills; it never invents structure.

## Skill shape

Location: `.claude/skills/lab-scaffold/SKILL.md`, with `templates/` (spec template, lab template pointers) and `references/` (reuse map, feasibility table) subfolders. Cursor users get a thin `.cursor/rules` pointer to the same file (AGENTS.md norm: canonical knowledge in repo docs).

Invocation:

- `/lab-scaffold <pdf|url|citation>` — paper mode
- `/lab-scaffold "one-sentence idea"` — idea mode
- Options: `[--mode vr|ar|cross-xr] [--evaluation docking|freeform|none]`

### Stage 0 — Produce an interaction spec (no code yet)

Both modes produce `docs/labs/<slug>-spec.md`:

- **Core interaction question** — one sentence, in the lab-description register.
- **Source** — citation for paper mode; the original idea sentence (verbatim) plus any related work identified, for idea mode.
- **Techniques / conditions** — each mapped to WebXR input reality (pointer types, hand joints, controller gamepad). Explicit *feasibility gate*: needs eye tracking / EMG / body tracking → flag as blocked or propose a WebXR-feasible approximation, citing `docs/overview.md`'s scope rules.
- **Parameter table** — every tunable with default, min, max, step, unit → becomes the Leva schema verbatim. In idea mode, defaults are proposed and marked `assumed` until the human confirms.
- **Measures** — what to measure (time, positional/rotational error, counts, or explicitly none) → HUD metric cells + `logTrialResult` schema.
- **Trial protocol** *(optional)* — conditions × repetitions, reset rules → `TrialSpec[]`. Freeform labs skip this.
- **Scope cuts** — what is deliberately not implemented, so the lab is honest (the HRI/HRS precedent in the roadmap).

**Human checkpoint:** the spec is reviewed before any scaffolding. In paper mode this catches a misread paper; in idea mode this *is* the design conversation, and it's the cheap place to have it.

### Stage 1 — Scaffold (the three-file contract, plus)

1. Registry entry in `src/config/labs.ts` (ID, name, mode, ≤9-word description in the house style).
2. Component under `src/labs/<vr|ar|cross-xr>/` from the template: LabHeading, theme accents, Leva controls from the parameter table (respecting `pitfalls.md` — plain sliders for size-like values), `useHudReport` cells from the measures.
3. Import in `src/app/LabContent.tsx`.
4. Defaults added to `tuningPresets` in `src/config/labs.ts`.
5. If the spec has a trial protocol: wire `useTrialRunner` + `logTrialResult` from it.

### Stage 2 — Technique implementation

Guided by references bundled with the skill:

- Reuse map: `useManipulation`, `useHandJoints`, feedback hooks (`useHapticPulse`, `useConfirmTone`), holos, `SharedScenery` — "check these before writing new systems."
- Behavior-not-input-source rule and the pointer-type table from `docs/overview.md`.
- Mandatory pre-read of `docs/pitfalls.md` sections (Leva plugins, drei Text nesting, camera far).
- Both-hands / both-inputs requirement stated as an acceptance criterion, not a suggestion.

### Stage 3 — Verify and hand off

- Typecheck + build + desktop smoke (lab renders, controls respond) via the visual-capture path (`?lab=<id>&capture=scene`); add the lab to the capture matrix.
- Emulator interaction pass where possible.
- Generate a **human test card**: a short checklist of the things an agent cannot verify (feel on Quest, hand-tracking recovery, comfort), pre-tagged for the session logger so headset notes land in the right place. In idea mode the test card leads with the idea's own success statement ("does it feel stickier near targets?").
- Update the spec doc with implementation status and deviations.

## Milestones

- **M0** — prerequisite refactors above (also independently valuable).
- **M1** — author the skill; **regression-test paper mode against the paper the repo already implements** (Mikkelsen et al., DOF separation): the skill should regenerate a recognizable ObjectManipulationLab skeleton from the PDF. Diffing its output against the hand-built lab is the calibration loop.
- **M2** — first *new* concept end-to-end, one per mode:
  - Paper: a classic with modest input needs (Go-Go / stretch-arm reach, PRISM CD-gain manipulation, or head-gaze-approximated Gaze&Pinch) so the demo is legible to non-specialists.
  - Idea: a one-sentence prompt taken at face value (e.g. "targets should gently pull the cursor when you get close") run through the interview → spec → lab loop.
- **M3** — record both runs (paper in / headset demo out; sentence in / headset demo out), embed in the README as the flagship story, and write the companion "graduate this primitive" skill (the extraction flow in Roadmap Phase 5) as the natural sequel.

## Risks / open questions

- **Paper ambiguity**: many papers under-specify parameters. The spec stage must force explicit "assumed value" annotations rather than silent guesses.
- **Idea vagueness (the idea-mode twin)**: the interview must converge in a handful of questions — a designer who wanted to feel an idea shouldn't get a requirements workshop. The escape valve is "propose defaults, let the human edit the spec."
- **Feasibility creep**: the gate in Stage 0 has to be strict — one blocked modality shouldn't stall the whole lab; propose approximations with the approximation clearly labeled in-lab (subtitle) and in the spec.
- **Template drift**: the skill is coupled to the lab template and contracts; CI should include a check that the template still compiles, and the skill doc should name the contract files it depends on so changes there prompt a skill update.
