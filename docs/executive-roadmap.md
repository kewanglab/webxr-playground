# Executive Roadmap: From Demo Collection to Platform

**Status:** Proposed sequencing for the next ~6 weeks of work.
**Context:** [Vision](./vision.md), [Roadmap](./roadmap.md) (phase-level detail), [Agent harness brief](./agent-harness-brief.md) (Path B, referenced by Phases 2–3 below).

**Organizing principle:** every phase turns one of the README's four Commitments (friction, live tuning, AI authoring, composable primitives) from prose into fact, ordered by leverage-per-cost, with the agent harness slotted early because it de-risks everything after it.

**North star:** in ~6 weeks, all four commitments are demonstrably true, and the repo can support its first real study.

Costs follow the agent-harness brief's convention — **agent** is active working time; **human** is review and decision time that cannot be delegated.

---

## At a glance

| # | Phase | Value proposition | Cost (agent) | Cost (human) | Depends on |
|---|-------|-------------------|-----|-------|------------|
| 1 | **Ship the public URL** | Makes Commitment #1 true; every future feature becomes a shareable link | 1–2 days | ~1 h | — |
| 2 | **Agent harness, core** ✅ **done** | Agent can drive XR input; foundation for all verification | 0.5–1 day | ~45 min | — (parallel with 1) |
| 3 | **Regression net + credibility floor** | Safety net before refactoring; instrument-grade trust | ~2 days | 1–2 h | 2 |
| 4 | **Graduate the first primitive** | Proves the platform thesis — the binary milestone | 2–3 days | ~2 h | 3 |
| 5 | **Operator console** | Makes Commitment #2 true, in a form no platform SDK offers | 3–4 days | ~2 h | 1 |
| 6 | **Study harness v1 + replay** | Turns the playground into a research instrument with a unique capability | 4–6 days | ~3 h | 1, 3 |
| 7 | **Agent scaffolding eval** | Makes Commitment #3 a verified headline, not a claim | 3–5 days | ~2 h | 2, 3, 4 |

**Total: ~16–23 agent-days, ~12 hours of human review, roughly 6 calendar weeks** with Phases 1–2 running in parallel in week 1.

---

## Phase detail

### Phase 1 — Ship the public URL *(week 1)*

Static deploy (GitHub Pages or Vercel) with HTTPS; URL-addressable state (`?lab=&technique=&cdGain=…`); a LICENSE file (MIT or Apache-2); README quickstart rewritten to "open this link in your headset."

*Value:* the single highest-leverage week available. The entire audience thesis — designers, researchers-with-participants, "try it tonight" — is gated on this. It also compounds: every phase after this ships as a link, not a git instruction.

*Done when:* someone with a Quest and no terminal can feel a tuned configuration from a URL you sent them.

### Phase 2 — Agent harness core ✅ *(landed — see [agent harness](./agent-harness.md))*

Vite 8 spike, `@iwsdk/vite-plugin-dev` install, `FRAMEWORK_MCP_RUNTIME` shim. Zero interaction-code changes.

*Value:* the co-pilot gains hands. Cheapest force-multiplier in the plan; strictly enabling for Phases 3 and 7.

*Done when:* an agent completes a grab-move-release in the Manipulation Lab and screenshots it in one turn. — **Met.** Driven end to end over the MCP bridge; verified against the lab's own trial record, not the screenshot alone.

*Outcomes worth carrying forward:*

- The Vite 8 gate cleared. The plugin's `vite ^7` peer range is a declaration mismatch only; an `overrides` entry resolves it.
- The harness is **opt-in** (`npm run dev:agent`), not always-on, so it cannot disturb the capture suite or reach a production build.
- Release precision is bounded — see Phase 3's note below before writing driven tests.
- It surfaced a real canvas-killing bug, now Phase 3 work.

### Phase 3 — Regression net + credibility floor *(week 2 — brief Phases 3–4, plus known gaps)*

One driven interaction test per lab; golden unit tests for `techniques.ts` and the OBB math; CI running typecheck + unit tests (decide the headless-WebGL question now, not later); fix the per-frame allocations in the manipulation loop.

**Carried in from Phase 2 — a CDN failure kills the whole renderer.** `@react-three/xr` loads hand and controller models from `cdn.jsdelivr.net` at session start. Nothing wraps the XR subtree in an error boundary, so a failed fetch propagates up, React unmounts to `<Canvas>`, and the WebGL context is lost. A decorative asset is load-bearing for the entire 3D view. This bites any user on a flaky connection or a restricted network, not just agents — the harness only found it because CI-like sandboxes have no CDN egress. Two fixes, ideally both: an error boundary around the XR subtree so an asset failure degrades to "no hand model", and locally-served input-profile assets so the request is never made. Symptom, cause and workaround are in [pitfalls](./pitfalls.md); the harness works around it today via `XRInput.handModel: false`.

**Note before writing driven tests.** The harness carries objects exactly but releases imprecisely — IWER animates the pinch open over several frames and the object tracks the thumb throughout, so a driven release lands reproducibly ~6.5 cm / 39.5° off the held pose. Real pinches do the same thing; it is not an emulation artifact. Assert on the carry, not on the recorded release offset, and treat "drive a snapped docking trial" as out of reach until release timing is addressed. See [agent harness → known characteristics](./agent-harness.md#known-characteristics).

*Value:* two audiences at once — researchers get tested measurement math; the team gets a safety net that makes the Phase 4 refactor low-risk instead of reckless.

*Done when:* CI is green on every PR and an interaction regression fails loudly before a human wears a headset.

### Phase 4 — Graduate the first primitive *(weeks 2–3)*

Extract selection (idle/targeted/confirmed) into `src/xr/interactions/select/`, define the domain contract, consume it from two labs — with Phase 3's tests green before and after.

*Value:* the platform thesis is currently falsifiable and false; this flips it. One graduation validates the entire Phase-5 design in the existing [roadmap](./roadmap.md) and produces the template every future primitive and every agent-scaffolded lab follows. This is the milestone that separates "demo collection" from "platform."

*Done when:* two labs import the same primitive and the README's Commitment #4 drops its "(Upcoming)" tag honestly.

### Phase 5 — Operator console *(weeks 3–4)*

Bidirectional parameter sync between a companion page (laptop/phone) and a live headset session — extend the existing log middleware locally, WebSocket/WebRTC for the hosted deployment.

*Value:* converts the "in-headset tuning" half-truth into something better than the original promise: researcher slides a threshold on a laptop, participant feels it instantly with an uncontaminated view. No platform SDK offers this workflow; it becomes the demo to lead with.

*Done when:* a parameter changed on a phone is felt in the headset within a frame or two, on the hosted URL.

### Phase 6 — Study harness v1 + trajectory replay *(weeks 4–6)*

Participant IDs, trial sequencer with counterbalancing, per-trial JSONL/CSV export; then hand-trajectory recording and replay — which deliberately shares machinery with Phase 2's emulation layer (a recorded session replayed through `xr_set_transform`).

*Value:* the playground becomes a citable research instrument. Replay is the defensible unique capability: re-run a participant's actual grab while swapping the mapping technique underneath it — nothing else in the field does this.

*Done when:* one full pilot study (even n=3) runs end-to-end and exports analyzable data.

### Phase 7 — Agent scaffolding eval *(week 6+)*

`CLAUDE.md`, a "scaffold a lab from this paper" skill, and a benchmark: paper PDF in, working lab out, *verified by the Phase 2 harness driving the new lab's input*.

*Value:* Commitment #3 becomes a measured capability with a success rate, not marketing. If it clears ~70%, it's a standalone writeup and the strongest recruiting pitch for the designer audience.

*Done when:* the benchmark runs on a paper the team hasn't hand-tested, and the scaffolded lab passes a driven interaction test.

---

## Continuous / opportunistic (don't schedule, do when touching adjacent code)

- Controller parity and two-handed grab in the Manipulation Lab (fold into Phase 4's refactor if convenient).
- Doc consolidation: collapse the planning docs toward three (README, architecture, roadmap) and fix drift (`XRMode` conflation, phantom "lazy component reference," stale dates).
- The "what transfers from WebXR" validity section in [vision.md](./vision.md) — one hour, large credibility return.

## Deliberately deferred

HRI/HRS lab, MenuLab, eye-gaze/EMG modalities, multi-user. All real, none load-bearing for the thesis, and every one of them gets cheaper after Phases 4 and 7 exist.

---

**The sequencing logic in one sentence:** week 1 makes the project *reachable* (URL) and *drivable* (harness), week 2 makes it *trustworthy* (tests), week 3 makes it *true to its thesis* (primitive), and weeks 4–6 make it *unique* (operator console, replay, agent eval) — each phase shipping as a link anyone can open.
