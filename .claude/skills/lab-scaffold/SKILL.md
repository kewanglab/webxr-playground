---
name: lab-scaffold
description: Scaffold a new XR interaction lab from a research paper (PDF, arXiv/DOI link, citation) or from a plain-language interaction idea. Produces a reviewable interaction spec first, then builds the lab through the repo's three-file contract with Leva controls, HUD metrics, and trial logging. Use when the user wants to turn a paper, a technique from the literature, or an interaction idea ("what if selection felt…") into a runnable lab.
---

# Scaffold an interaction lab

You are turning an interaction concept into a runnable lab in this playground. The concept arrives in one of two forms; both converge on the same artifact — an **interaction spec** — and everything after the spec is identical.

- **Paper mode** — input is a paper (PDF/URL/citation). Your job is faithful *extraction* plus a WebXR feasibility check.
- **Idea mode** — input is a sentence or two of intent. Your job is to *co-author* the spec: draft it with proposed defaults, ask only the questions you cannot default.

Never write lab code before the spec is approved. The spec review is the cheap place to catch a misread paper or a misunderstood idea.

## Before anything

Read these (skim what you already know):

1. `docs/overview.md` — §"Key @react-three/xr v6 patterns" and §"Pointer types" (behavior-first rule), §"AI-Agent Conventions"
2. `docs/pitfalls.md` — entire file; it is short and every entry is a bug this repo already hit
3. `src/labs/_template/TemplateLab.tsx` — the reference lab; you will copy it, not invent structure
4. `references/reuse-map.md` (in this skill) — what already exists; check before writing any new system
5. `docs/design-handoff/skill.md` — visual language, if you will be staging scenery

## Stage 0 — Produce the interaction spec

Create `docs/labs/<slug>-spec.md` from `templates/interaction-spec.md` (in this skill).

**Paper mode:** read the paper fully before writing. Extract techniques, parameters (with the paper's values), measures, and protocol. Where the paper under-specifies a value, choose one and mark it `(assumed)` — never silently guess. Run every technique through the feasibility table in `references/reuse-map.md`; a technique that needs unavailable sensing (eye tracking, EMG, body tracking) is either **cut** (listed under Scope cuts, like the repo's HRI/HRS precedent) or **approximated** (e.g. head-gaze for eye-gaze) with the approximation named in the spec *and* in the lab's subtitle.

Two lessons from the M1 calibration run (`docs/labs/dof-separation-spec.md`):

- **Requirements over mechanisms.** When a paper describes an implementation detail (an offset, a compensation term, a specific joint), extract the *behavioral requirement* it serves ("object stays at pinch point absent rotation") and record the mechanism as one way to satisfy it. An implementation that meets the requirement by other means is faithful; judging fidelity by mechanism produces false diffs.
- **Don't drop the time measures.** Papers almost always pair accuracy with speed (completion time, acquisition time). They cost little — the trial runner marks trial start and the lab has acquisition callbacks — and their absence is the most common gap between a demo and a research instrument.

**Idea mode:** first draft the spec yourself from the idea sentence — propose the behavior domain, 1–3 conditions, a parameter table with plausible ranges, and measures — marking everything you chose as `(assumed)`. Then ask the user **at most 3–5 questions**, only for decisions that materially fork the build:

- Which behavior domain is this? (select / grab / place / locomote / menu) — only if genuinely ambiguous
- What varies — what are you comparing against? (a single condition is fine; "vs. the standard way" is a valid answer)
- What should be tunable while feeling it? (offer your parameter table for edits)
- How will you know it works — a measurement, or feel-only? (`measures: none` is a valid, complete answer; Zen Garden is the precedent)

Do not run a requirements workshop. The user edits your draft; they don't fill a blank page. If the idea resembles known work (bubble cursor, Go-Go, PRISM…), say so and offer the literature's parameter ranges as defaults — but don't require the connection.

**Gate: show the spec and get explicit approval before Stage 1.** Record the verbatim input (citation or idea sentence) in the spec's Source section.

## Stage 1 — Scaffold the three-file contract

1. `src/config/labs.ts` — add the `LabId` union member and registry entry: name in title case ending "Lab", mode (`vr` | `ar` | `cross-xr`), description ≤9 words, present tense, parallel to existing entries. Add the spec's parameter defaults to `tuningPresets`.
2. Copy `src/labs/_template/TemplateLab.tsx` to `src/labs/<vr|ar|cross-xr>/<Name>Lab.tsx` and fill it from the spec: Leva schema from the parameter table verbatim (folder name = lab name; plain sliders for size-like values — see pitfalls), `useHudReport` cells from the measures (≤4), `LabHeading` subtitle showing the live configuration including any approximation label.
3. `src/app/LabContent.tsx` — add the case.

If the spec has a trial protocol: build the `TrialSpec[]` from it and wire `useTrialRunner` + `logTrialResult` (see `src/xr/interactions/evaluation/` and DockingMode as the worked example). If not: omit both entirely.

Anything a headset user needs (restart, condition switch) must exist as scene geometry, not only in Leva — Leva is desktop-only.

## Stage 2 — Implement the technique

- Organize by behavior, never by input source. `pointerEventsType` filters mechanism (ray/touch/grab), not device — restrict only when the comparison demands it.
- Check the reuse map before writing any new system: manipulation math, hand joints, feedback (haptic/tone), holos, scenery, eye-level staging all exist.
- Both controllers and hands must work unless the spec explicitly scopes to one (then the subtitle says so).
- Keep hitboxes honest: visual polish must not change interaction geometry (pitfalls: "prop-language pass, not a mechanics rewrite").

## Stage 3 — Verify and hand off

1. `npx tsc -b` and `npx vite build` — clean.
2. Desktop smoke: load `/?lab=<id>` (and `&theme=cloud-park`), confirm the lab renders, Leva controls respond, HUD report populates. Use `?capture=scene&captureView=hero` for a reviewable frame; add the lab to `tests/visual/capture.spec.ts`'s lab matrix.
3. Emulator pass where possible (localhost auto-emulation): enter XR, drive one full interaction, one full trial if applicable.
4. Update the spec doc: implementation status, deviations, assumed values that survived.
5. Generate a **human test card** appended to the spec: the checklist of what only a headset can judge — comfort, feel, hand-tracking recovery, both-hands behavior — phrased as concrete actions ("stand a step left of start, snap-turn: do you rotate in place?"). In idea mode, the first item is the idea's own success statement, verbatim.

Report to the user: files touched, what to feel first on the headset, and the open assumed values.

## Hard rules

- No code before spec approval.
- Never fabricate paper findings or parameter values — mark assumptions.
- The three-file contract is not optional; if the lab seems to need architecture changes, stop and say so instead of improvising.
- New reusable logic goes in the lab first; graduation into `src/xr/interactions/` is a separate, later step (roadmap Phase 5) — don't pre-abstract.
