# Testing automation plan

## Purpose

Reduce manual headset testing to the parts only a human can do — wearing the device, judging feel, and approving visual baselines — by automating everything else. The plan is sliced so each stage lands independently, is verifiable in under five minutes without reading code, and unlocks the next stage.

**Related docs:** [Overview](./overview.md) (stack and device-testing workflow), [Visual capture workflow](./visual-capture.md) (existing Playwright screenshot rig), [Pitfalls](./pitfalls.md) (bugs the unit layer is designed to catch).

## Key insight

`@react-three/xr` v6 already ships [IWER](https://meta-quest.github.io/immersive-web-emulation-runtime/) (Meta's Immersive Web Emulation Runtime) — it powers the localhost Quest 3 emulator we use daily. IWER also supports **programmatic control** (move the headset, position controllers/hands, press buttons from test code) and **action recording/playback** (record a real Quest session once, replay it deterministically in CI forever). The plan graduates from "emulator as a dev toy" to "emulator as the automated test driver."

## Division of labor

| Who | What |
|---|---|
| Agent | Everything buildable and self-verifiable: test harnesses, specs, CI, tooling, docs. Verifies each slice by running it before handing over. |
| Human | The three things automation can't do: record ground-truth sessions in the headset, judge interaction feel/comfort, approve visual baselines. Reviews behavior, not diffs. |

Standing rules:

1. One commit series / PR per slice, each with a **"verify in 5 minutes"** section: a single command plus what you should see.
2. Any change to product code under `src/` is flagged explicitly. Slices 1–2 need at most a small test-mode hook; anything larger stops for discussion first.

## Slices

### Slice 1 — Foundation: unit layer + CI *(agent, autonomous)*

- Vitest unit tests for the pure interaction logic that already exists and is exported: manipulation techniques (`src/labs/cross-xr/manipulation/techniques.ts`), store transitions (`src/app/store.ts`), Leva number normalization (`src/ui/levaPlugins/readLevaNumber.ts`), lab/theme validators (`src/config/`), capture URL params (`src/app/captureOptions.ts`), director tween math (`src/cinematics/director.ts`).
- GitHub Actions workflow: typecheck → unit tests → Playwright visual capture suite (headless), with capture artifacts uploaded for review.
- **No product-code changes.**

**Verify:** Actions tab is green on the PR; `npm test` locally prints the passing suite in seconds.

### Slice 2 — XR test harness: IWER + Playwright *(agent, autonomous)*

- Direct `iwer` devDependency and a Playwright fixture that exposes programmatic control of the emulated device (headset pose, controller/hand transforms, button and pinch events).
- First real XR spec: enter an emulated session, ray-select a target in the Selection Lab, assert the confirmation in app state.

**Verify:** run one command in headed mode and watch the emulated session perform the selection; the spec passes.

### Slice 3 — Record on headset, replay in CI *(joint — the only slice needing the headset)*

- Agent: IWER `ActionRecorder` wiring with an export path modeled on the existing session-logger sync (`/api/logs`), plus a short recording procedure doc.
- Human: one clean pass per lab on the Quest — controllers and hands — ~20 minutes total; export the recordings.
- Agent: turn recordings into `ActionPlayer` replay specs that run on every PR.

**Verify:** watch a replay spec re-perform your own recorded session on desktop; CI runs them from then on.

### Slice 4 — AR emulation + visual regression *(agent builds, human judges)*

- `@iwer/sem` synthetic environment so the Placement Lab's hit-test flow runs on desktop and in CI.
- Convert capture specs to Playwright `toHaveScreenshot` regressions with committed baselines.
- Human checkpoint: approving baseline images — a design-eye task per the Cloud Park beauty-review checklist.

**Verify:** intentionally nudge a camera or color; CI fails with a visual diff attached.

### Slice 5 — On-device smoke script *(optional, later)*

- Playwright `connectOverCDP` over `adb forward` to the Quest Browser: load each lab on real hardware, fail on console errors, collect timings. Run manually or nightly when a headset is plugged in.
- Real interaction feel remains a human job — this only automates "does it load clean on device."

## What stays manual, on purpose

Comfort, latency feel, hand-tracking quality, and beauty judgment. Automation shrinks headset time from "every change" to "when the interaction design itself changes" — it does not replace the design review.

## Status

- [x] Slice 1 — landed with this document
- [ ] Slice 2
- [ ] Slice 3
- [ ] Slice 4
- [ ] Slice 5
