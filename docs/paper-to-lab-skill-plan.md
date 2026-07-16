# Plan: the "research paper → lab" skill

The agentic-harness milestone from [Roadmap](./roadmap.md) and [Vision](./vision.md): a Claude Code skill that takes a research paper (PDF, arXiv/DOI link, or citation) and scaffolds a working lab — registry entry, component, Leva controls, measurement hooks, HUD report, session-logger integration — so the human spends their time on the interaction question, not the plumbing.

The existing `docs/design-handoff/skill.md` covers *visual* design inside the system; this skill covers *interaction scaffolding*. They are complementary and the lab skill should reference the design skill for staging/tokens.

## Why this is the right flagship

The repo's thesis is "AI as the authoring layer" (README Commitment 3). Today that's a claim; this skill makes it demonstrable: *"I read this paper this morning, let me try it on Quest tonight."* The strongest possible portfolio artifact is a recorded run of the skill turning a real paper into a running lab.

## Prerequisite refactors (M0)

The skill is only as reliable as the contracts it targets. Three small extractions make the scaffold mechanical instead of interpretive:

1. **`useTrialRunner`** — lift DockingMode's trial machinery (trial list, index, per-trial measures, completion state, restart) into `src/xr/interactions/evaluation/useTrialRunner.ts` with a typed `TrialSpec` / `TrialMeasure` contract. Fix the snap/reset bugs (repo review #1–2) during extraction. This is also the first Phase-5 "graduated primitive."
2. **Results persistence** — a `logTrialResult()` helper that writes structured trial results (lab, technique, condition, measures) to the session log / `/api/logs`, so every scaffolded lab gets data capture for free.
3. **A reference lab template** — `docs/templates/lab-template.tsx` (or a heavily-commented minimal lab in-tree): LabHeading + theme tokens + Leva group + `useHudReport` + optional trial runner + both-input-modes checklist as comments. The skill copies and fills; it never invents structure.

## Skill shape

Location: `.claude/skills/paper-to-lab/SKILL.md`, with `templates/` and `references/` subfolders. Cursor users get a thin `.cursor/rules` pointer to the same file (AGENTS.md norm: canonical knowledge in repo docs).

Invocation: `/paper-to-lab <pdf|url|citation> [--mode vr|ar|cross-xr] [--evaluation docking|freeform|none]`

### Stage 0 — Extract an interaction spec (no code yet)

The skill reads the paper and produces `docs/papers/<slug>.md`:

- **Core interaction question** — one sentence, in the lab-description register.
- **Techniques / conditions** — each mapped to WebXR input reality (pointer types, hand joints, controller gamepad). Explicit *feasibility gate*: needs eye tracking / EMG / body tracking → flag as blocked or propose a WebXR-feasible approximation, citing `docs/overview.md`'s scope rules.
- **Parameter table** — every tunable with default, min, max, step, unit → becomes the Leva schema verbatim.
- **Measures** — what the paper measured (time, positional/rotational error, throughput, TLX-style subjective) → HUD metric cells + `logTrialResult` schema.
- **Trial protocol** — conditions × repetitions, reset rules, counterbalancing notes → `TrialSpec[]`.
- **Scope cuts** — what is deliberately not implemented, so the lab is honest (the HRI/HRS precedent in the roadmap).

**Human checkpoint:** the spec is reviewed before any scaffolding. This is the cheap place to catch a misread paper.

### Stage 1 — Scaffold (the three-file contract, plus)

1. Registry entry in `src/config/labs.ts` (ID, name, mode, ≤9-word description in the house style).
2. Component under `src/labs/<vr|ar|cross-xr>/` from the template: LabHeading, theme accents, Leva controls from the parameter table (respecting `pitfalls.md` — plain sliders for size-like values), `useHudReport` cells from the measures.
3. Import in `src/app/LabContent.tsx`.
4. Defaults added to `tuningPresets` in `src/config/labs.ts`.
5. If `--evaluation docking`: wire `useTrialRunner` + `logTrialResult` from the trial protocol.

### Stage 2 — Technique implementation

Guided by references bundled with the skill:

- Reuse map: `useManipulation`, `useHandJoints`, feedback hooks (`useHapticPulse`, `useConfirmTone`), holos, `SharedScenery` — "check these before writing new systems."
- Behavior-not-input-source rule and the pointer-type table from `docs/overview.md`.
- Mandatory pre-read of `docs/pitfalls.md` sections (Leva plugins, drei Text nesting, camera far).
- Both-hands / both-inputs requirement stated as an acceptance criterion, not a suggestion.

### Stage 3 — Verify and hand off

- Typecheck + build + desktop smoke (lab renders, controls respond) via the visual-capture path (`?lab=<id>&capture=scene`); add the lab to the capture matrix.
- Emulator interaction pass where possible.
- Generate a **human test card**: a short checklist of the things an agent cannot verify (feel on Quest, hand-tracking recovery, comfort), pre-tagged for the session logger so headset notes land in the right place.
- Update `docs/papers/<slug>.md` with implementation status and deviations.

## Milestones

- **M0** — prerequisite refactors above (also independently valuable).
- **M1** — author the skill; **regression-test it against the paper the repo already implements** (Mikkelsen et al., DOF separation): the skill should regenerate a recognizable ObjectManipulationLab skeleton from the PDF. Diffing its output against the hand-built lab is the calibration loop.
- **M2** — first new paper end-to-end. Good candidates: a classic with modest input needs (Go-Go / stretch-arm reach, PRISM CD-gain manipulation, or a gaze-approximated Gaze&Pinch using head-gaze) so the demo is legible to non-specialists.
- **M3** — record the run (paper in, headset demo out), embed it in the README as the flagship story, and write the companion "graduate this primitive" skill (the extraction flow in Roadmap Phase 5) as the natural sequel.

## Risks / open questions

- **Paper ambiguity**: many papers under-specify parameters. The spec stage must force explicit "assumed value" annotations rather than silent guesses.
- **Feasibility creep**: the gate in Stage 0 has to be strict — one blocked modality shouldn't stall the whole lab; propose approximations with the approximation clearly labeled in-lab (subtitle) and in the spec.
- **Template drift**: the skill is coupled to the lab template and contracts; CI should include a check that the template still compiles, and the skill doc should name the contract files it depends on so changes there prompt a skill update.
