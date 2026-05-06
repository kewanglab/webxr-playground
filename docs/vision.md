# Vision

## Purpose of this document

**Vision** is the long-horizon "why this exists" doc — what the playground is a bet on, who it's for, and where it's heading. It changes rarely. For *how it's shaped today* see [Overview](./overview.md), and for *what's next* see [Roadmap](./roadmap.md).

---

## The pitch

**An open, web-based laboratory for the people inventing how humans will touch, point, grab, and move through spatial computing.**

Built and tested on Quest 3, but because it lives in the browser it carries the smallest possible learning and setup curve — no SDK installs, no app-store review, no platform lock-in. A `localhost` URL and a headset is all it takes to be in the lab. And because it is WebXR, the same playground reaches the widest possible range of AR and VR devices: Quest 2/3/Pro, Vision Pro, Pico, Magic Leap, ARCore phones, and whatever ships next.

## Who it's for

Three concentric circles around a single goal:

- **Researchers** — quickly implement and evaluate new interaction primitives with real participants.
- **Designers** — prototype patterns from new papers, *feel* them, remix them, contribute back.
- **Developers** — experiment, fork primitives, push the engineering boundary.

**The unifying promise:** *the lowest technical barrier to build and experiment with XR interaction design — with AI as a co-pilot.*

This is the real differentiator. Not "for researchers" or "for designers" or "for developers" — for **anyone with an idea about how XR interaction should feel**, regardless of how much R3F or WebXR they already know. The web stack plus an AI-agent-friendly architecture is what makes that possible.

## Why web, why Quest 3 as the primary target

- **Web means lowest barrier.** Clone, `npm install`, open a URL in a headset browser. No native build, no SDK, no store review. New collaborators are productive in minutes.
- **Web means widest reach.** WebXR runs on Quest, Vision Pro, Pico, Magic Leap, ARCore phones — the same code reaches the whole device matrix without per-platform forks.
- **Quest 3 as primary test target.** Quest 3 is where most users are today and where performance constraints are honest. Optimizing for Quest-class WebXR keeps the playground fast everywhere else by construction.

## One primitive per lab — and mix-and-match across labs

Each lab isolates a single interaction question — selection, grab, placement, locomotion, manipulation — so it can be studied honestly, A/B'd against alternatives, and tuned with live parameters in front of real participants. That is the research microscope.

The real magic is the **mix-and-match layer**: any lab can pull in graduated primitives from any other lab. Want to feel what *teleport + DOF-separated grab + gaze-confirmed selection* feels like together? Snap them in and try. Combinatorial exploration is where surprising, emergent interaction patterns are born — the ones no single paper would have proposed on its own.

This makes the playground both:

- a **research instrument** — controlled, measurable, participant-ready, and
- a **creative sandbox** — open-ended, remixable, inspiration-producing.

## The bigger picture

Spatial computing is at the same moment GUI design was in the early 80s — the conventions are not settled yet. Drag, click, scroll, and pinch-to-zoom all had to be invented and validated before they felt obvious. XR's equivalents — its grab, its select, its menu, its locomotion — are still being authored, right now, in scattered demos and research papers.

This playground is a bet that if those experiments live in **one open, web-native, mix-and-match environment**, the field converges faster on the interactions that feel truly natural and delightful — and the people doing the inventing get to build on each other's work instead of starting from zero every time.

## Where it's heading

Near-term build priorities live in [Roadmap](./roadmap.md). The longer arc:

- **Interaction platform.** Graduate proven patterns out of individual labs into a shared library of primitives, with cross-lab A/B presets and a reusable feedback layer (visual, audio, haptic).
- **Expanded labs and AR depth.** Menus, world-locked UI, AR readability and depth studies, more research-led labs as new papers land.
- **New input modalities.** Eye-gaze (Quest Pro, Vision Pro), EMG (Meta's neural wristband, CTRL-Labs lineage), and whatever comes next plug in behind behavior-first primitives — so every existing lab inherits them on day one.
- **Agentic harness for scaffolding labs.** A growing layer of rules, skills, and agent prompts (`CLAUDE.md`, `AGENTS.md`, Claude Code skills, Cursor rules) that lets an AI agent take a research paper PDF or a napkin idea and scaffold a working lab — registry entry, component file, leva controls, measurement hooks, session-logger integration — so the human can focus on the interaction question, not the plumbing. The playground's three-files-to-add-a-lab convention is the seed; the harness is what makes *"I read this paper this morning, let me try it on Quest tonight"* a realistic workflow.

## How to contribute — and how AI helps you contribute

Adding a lab is intentionally three edits:

1. Add an entry to [`src/config/labs.ts`](../src/config/labs.ts).
2. Create the component under `src/labs/<vr|ar|cross-xr>/`.
3. Add the import in `src/app/LabContent.tsx`.

That convention is not just an ergonomic — it is the contract that lets an AI agent scaffold a new lab from a paper or a sketch with high reliability. The repo's `AGENTS.md`, `CLAUDE.md`, and skill files are deliberate investments in that contract: the more an agent can do for you, the more time you spend on the actual interaction question.

If you have an idea — from a paper, from a hallway conversation, from a headset session that left you wanting something different — the playground is built so you can try it tonight, share it tomorrow, and graduate it into shared primitives the week after.
