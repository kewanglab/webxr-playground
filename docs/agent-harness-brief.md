# Agent-drivable XR harness — project brief (Path B)

**One-line:** Adopt Meta's IWSDK agent tooling as a dev dependency so an AI agent can *drive* the labs — move the headset, pinch, pull triggers, push thumbsticks — without changing a line of interaction code.

**Status:** Proposed. **Companion brief:** [IWSDK engine migration](./iwsdk-migration-brief.md) (Path A — the rejected alternative).
**Context:** [Vision](./vision.md), [Overview](./overview.md), [Roadmap](./roadmap.md), [Visual capture workflow](./visual-capture.md).

---

## Problem

The playground can photograph interactions. It cannot perform them.

Today's agent loop is genuinely good at what it does: URL-driven deterministic state (`?lab=&theme=&capture=&captureView=`), authored review cameras in `DesktopPreviewCamera.tsx`, director mode with `?seek=` and `?pause=1`, and a luminance assertion in `tests/visual/capture.spec.ts` that fails loudly on a black canvas.

But every one of those is a *camera*. Nothing in the repo can move a controller, pinch a hand, pull a trigger, or push a thumbstick. IWER is already loaded via `@react-three/xr`, yet nothing drives it — `App.tsx:58-105` spends 45 lines *hiding* its UI. Automated verification tops out at a 48×48-pixel luminance heuristic.

This is a sharp mismatch with what the project is for. All four labs — Selection, Placement, Locomotion, Manipulation — are *input* studies. None has automated coverage of the input. Every claim about how a technique feels, every regression in `useManipulation.ts`, every docking-offset measurement currently requires a human in a headset.

[Vision](./vision.md) stakes the project on "the lowest technical barrier to build and experiment with XR interaction design — **with AI as a co-pilot**." Right now the co-pilot can look out the window but can't reach the controls.

## Goal

Close the input half of the loop. An agent should be able to open a lab, perform a grab, screenshot mid-interaction from the emulated headset POV, read the console, and iterate — inside a single turn, with no spec edits.

## Approach

Install `@iwsdk/vite-plugin-dev` as a dev dependency alongside the existing `desktopLogApiPlugin()` in `vite.config.ts`. It is a standalone Vite plugin; it does **not** require `@iwsdk/core` or any IWSDK engine adoption.

The plugin exposes 32 MCP tools that split cleanly in two:

- **19 are framework-agnostic** — all `xr_*` (device transforms, select, gamepad state, input mode, session control) and all `browser_*` (screenshot, console logs, reload). These ride on IWER + Playwright and don't care what renders the scene.
- **13 require `window.FRAMEWORK_MCP_RUNTIME`** — `scene_*` and `ecs_*`.

That second hook is duck-typed and explicitly documented as open: *"Requires IWSDK **or a framework that provides FRAMEWORK_MCP_RUNTIME**."* The relay is a two-method contract:

```js
window.FRAMEWORK_MCP_RUNTIME?.handles(method)
  ? window.FRAMEWORK_MCP_RUNTIME.dispatch(method, params)
  : device.remote.dispatch(method, params)
```

So we take the 19 free, shim what's worth shimming, and skip the rest.

## Scope

### In scope

Estimates assume the implementation is driven by an agent (Opus 5) with a human reviewing at phase boundaries. **Agent** is active working time; **human** is review and decision time that cannot be delegated. See [what compresses](#what-compresses-and-what-does-not) below for why the two columns diverge so sharply.

| Phase | Work | Agent | Human |
|---|---|---|---|
| **0** | **Vite 8 spike.** Plugin peer-declares `vite ^7.0.0`; repo is on `^8.0.2`. Verify on a throwaway branch before anything else. | ~1 h *(fat tail — see risks)* | — |
| **1** | Add `iwsdkDev({ ai: { mode: 'agent', tools: ['claude'] } })`. Set `emulate: false` in `xrStore.ts` so the plugin's IWER owns emulation deterministically. Re-evaluate the DevUI hack in `App.tsx:58-105`. | 1–2 h | ~15 min |
| **2** | `FRAMEWORK_MCP_RUNTIME` shim (~150 lines): `scene_get_hierarchy` + `scene_get_object_transform` from the R3F `Object3D` graph; `ecs_pause`/`resume`/`step` via `frameloop="never"` + `advance()`; partial `ecs_query_entity`/`set_component` mapped onto the zustand stores and Leva params. | 2–3 h | ~30 min |
| **3** | First real interaction tests — one per lab. Grab-move-release in Manipulation, teleport in Locomotion, ray-vs-touch in Selection, hit-test confirm in Placement. | 4–8 h | ~1 h |
| **4** | Deconflict Playwright lifecycles (plugin's managed browser vs. `playwright.config.ts` on port 5175). Decide whether interaction tests run in CI. | 2–4 h | decision, not code |

**Total: ~1.5–2 agent-days of active work plus ~2 hours of human review**, spread across 2–4 calendar days once checkpoints are accounted for. Phases 0–2 — roughly half a day — still deliver most of the value.

For comparison, the same plan estimated as solo human developer work is ~1–1.5 weeks. The compression is real but closer to **3–4×, not 10×**, because the binding constraint moves off typing and onto verification.

### What compresses, and what does not

**Compresses hard.** Phase 2 is the most agent-favorable work in the plan: self-contained, well-specified, and testable without a headset. Traversing an `Object3D` graph into JSON and wiring `frameloop="never"` + `advance()` are mechanical once the contract is fixed. Phases 0–1 are small diffs whose cost is mostly `npm install` wall-clock and error-reading.

**Compresses weakly.** Phase 3 is the honest exception. Writing the test code is fast; *discovering the input choreography* is not. Finding the exact sequence of `xr_set_transform` and `xr_set_select_value` that actually triggers a grab in `useManipulation.ts` is empirical, and each iteration costs a page load plus R3F settle time (`capture.spec.ts` already budgets an 850 ms breath) plus session entry. Flakiness only surfaces serially. An agent iterates faster than a human but is bounded by cycle time, not typing speed.

**Does not compress at all.**

- **Wall-clock** — installs, dev-server boots, Playwright runs.
- **Human judgment calls** — whether the DevUI hack is still needed, whether an emulated grab is a *faithful* grab, whether interaction tests belong in CI. An agent can produce evidence for each; it should not close them alone.
- **Quest validation.** Unchanged and uncompressible. Emulation is a rung on the test pyramid, not the top one.

**Consequence for the risk profile.** Total risk doesn't drop, but the fixed tails — the Vite 8 unknown, headless WebGL in CI, Quest validation — stay the same size while everything around them shrinks. They therefore become a *larger share* of the project. Phase 0 gating matters more here, not less: if the plugin genuinely breaks on Vite 8, the research to work around it (patch, fork, or pin Vite 7) could exceed the entire rest of the plan.

### Out of scope

- `@iwsdk/core`, ELICS, or any engine change. R3F stays.
- `@iwsdk/reference` / the RAG server. It indexes *IWSDK's* codebase — useless here, and costs a ~48 MB corpus plus a HuggingFace ONNX model on first run. `AGENTS.md` + `docs/` already do this job better.
- Replacing the existing visual capture workflow. The two are complementary: `capture=scene` stays the authored-composition review shot; `browser_screenshot` becomes the mid-interaction shot.
- Quest validation. Emulated pinch has none of real hand-tracking's jitter. This adds a rung to the test pyramid; it doesn't remove the top one.

## What we get

| Capability | Today | After |
|---|---|---|
| Move headset / controllers programmatically | ✗ | `xr_set_transform`, `xr_animate_to`, `xr_look_at` |
| Pinch / trigger, incl. partial values for grab-move-release | ✗ | `xr_select`, `xr_set_select_value` |
| Thumbstick axes (smooth vs snap turn) | ✗ | `xr_set_gamepad_state` |
| Swap controller ↔ hand mid-session | ✗ | `xr_set_input_mode` |
| Screenshot from inside an emulated session | ✗ (desktop cameras only) | `browser_screenshot` |
| Browser console in the agent loop | ✗ (dev-server stdout only) | `browser_get_console_logs` |
| Scene graph inspection | ✗ | `scene_*` via shim |
| Frame-stepping | ✗ | `ecs_step` via R3F `advance()` |

Tool reachability: **24 of 32 fully, 6 partial, 2 out of reach** (`ecs_list_systems` / `ecs_toggle_system` — IWSDK's named, individually pausable system registry has no R3F analogue).

## Non-goals / honest limits

- **Phases 1 and 4 of the value are partly reachable today.** An agent could already write ad-hoc Playwright scripts for screenshots and console logs — the repo has `@playwright/test`. The marginal gain there is latency and ergonomics, not capability. **The genuine capability gap is programmatic XR input**, where the alternative is reaching into IWER's device object through undocumented `page.evaluate` calls.
- Emulated input is not real input. This buys regression coverage and faster iteration, not ground truth.
- The 6 "partial" tools stay partial. IWSDK gets generic reflective access because every value lives in a typed component with a declared schema; our state is spread across zustand, Leva, refs, and hook closures. Shimming the zustand + Leva surface covers the live-tuning params — most of what you'd want to poke — but not arbitrary state. That's structural.

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Vite 8 peer mismatch** blocks the plugin | **High** — gates everything | Phase 0 spike first. Plugin only uses stable hooks (`configureServer`, `transformIndexHtml`, `configResolved`, `buildStart`, `closeBundle`, `resolveId`, `load`), so a peer-range warning is the likely outcome, but this is unverified. |
| Two IWER runtimes collide | Low | Verified benign: `@pmndrs/xr`'s `injectEmulator` bails when `isSessionSupported` already resolves true, and the plugin's `transformIndexHtml` head script runs first. Still set `emulate: false` explicitly rather than trust an async race. Version skew is real (`iwer ^2.1.0`/`devui ^1.1.1` vs `^2.2.1`/`^2.2.0`) but only one instance ends up installed. |
| Playwright lifecycle contention | Medium | Phase 4. Plugin manages its own browser; `playwright.config.ts` has a `webServer` block on port 5175. |
| Generated MCP config lands in-repo | Low | `iwsdk adapter sync` writes marked blocks into `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `.codex/config.toml`. Merge is non-destructive, but note `AGENTS.md`: *"keep canonical project knowledge in repo docs rather than tool-specific config."* Keep the generated files thin. |
| Shim maintenance | Medium | `FRAMEWORK_MCP_RUNTIME` has no semver promise to third-party implementers. ~150 lines is cheap to re-fit, but it is ours to keep working. Pin the plugin version. |

Node is fine: engines want `>=20.19 <21 \|\| >=22.12 <23 \|\| >=24`; we're on v22.22.2.

## Success criteria

1. An agent completes a grab-move-release in Manipulation Lab and screenshots the result, in one turn, with no spec file edits.
2. At least one automated interaction regression test per lab, runnable via `npm run`.
3. Zero changes to `src/labs/**` interaction logic to achieve the above.
4. Existing `npm run capture:screenshots` and `npm run test:visual` still pass unchanged.
5. `docs/visual-capture.md` gains a sibling section (or doc) covering the interaction loop, so the two workflows are documented as complementary.

## Why this over Path A

Path B preserves the thesis. [Vision](./vision.md) bets on "no SDK installs, no platform lock-in," reaching Vision Pro / Pico / Android XR from one codebase. Path B adds a **dev dependency** that vanishes at build time; Path A adopts a Meta-authored, Quest-shaped runtime as the engine.

We get the tooling either way. Path B costs ~1.5–2 agent-days and no interaction-code changes. Path A costs a rewrite of ~10k lines. See the [companion brief](./iwsdk-migration-brief.md) for the full accounting of what Path A would additionally buy — note that its estimate is still expressed in human-weeks and has not had an equivalent agent-assisted pass.

## Open questions

- Does the plugin actually run on Vite 8? **Phase 0 answers this and gates the rest.**
- Do interaction tests belong in CI, or stay a local/agent-invoked tool? (Headless WebGL in CI is its own project.)
- ~~Is the partial zustand/Leva shim worth building in Phase 2, or should it wait until Phase 3 shows what an agent actually reaches for?~~ **Resolved by the agent-time estimate:** it is roughly an hour of the Phase 2 budget. Build it speculatively and delete what goes unused, rather than sequencing around the question.
