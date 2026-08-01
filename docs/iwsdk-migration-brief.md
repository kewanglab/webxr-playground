# IWSDK engine migration — project brief (Path A)

**One-line:** Rebuild the playground on Meta's Immersive Web SDK — swapping React Three Fiber for `@iwsdk/core`'s ELICS entity-component system — to get the full 32-tool agent surface plus a batteries-included XR engine.

**Status:** Proposed, **not recommended at this time.** Written to be decided against on the merits, and to record the conditions that would change the answer.
**Companion brief:** [Agent-drivable XR harness](./agent-harness-brief.md) (Path B — the recommended alternative).
**Context:** [Vision](./vision.md), [Overview](./overview.md), [Roadmap](./roadmap.md), [Pitfalls](./pitfalls.md).

---

## The case for it

This is not a tooling decision dressed up as an engine decision. Taken seriously, IWSDK offers three things the playground does not have and has been slowly hand-building.

**1. A real engine underneath the labs.** `@iwsdk/core` 0.4.2 ships Havok physics (`@babylonjs/havok`), `@pmndrs/uikit` spatial UI, `@iwsdk/locomotor` (physics-based movement with collision), GLXF composite scenes, and a GLB optimizer Vite plugin. Against the current repo:

| IWSDK provides | Repo today |
|---|---|
| Havok physics | None |
| `@pmndrs/uikit` spatial UI | Hand-rolled `HUDPanel` / `TagAlongHUD` on drei `Text` — and [pitfalls.md](./pitfalls.md) documents drei-`Text`-layout footguns as a recurring hazard |
| `@iwsdk/locomotor` | `LocomotionLab` rolls its own teleport + smooth movement |
| GLXF + `vite-plugin-gltf-optimizer` | `scripts/build-xr-kit-glb.mjs` driving the gltf-transform CLI by hand |

Roadmap Phases 5–6 (shared interaction primitives, deeper AR, MenuLab, UIReadabilityLab) point toward more of exactly this. Some of it we would otherwise build ourselves.

**2. Generic reflective access to state — the thing a shim cannot fake.** In IWSDK every gameplay value lives in a typed component with a declared schema. An agent can enumerate all components, query any entity, mutate any field, snapshot the whole world, and diff two snapshots — without anyone having written per-value plumbing. Under Path B we can shim the zustand + Leva surface, which covers the live-tuning params, but our state is genuinely scattered across zustand stores, Leva panels, React refs, and hook closures (`useManipulation.ts`, `useHandJoints.ts`). Reflection over *arbitrary* state is not available to us. That gap is structural, not a matter of writing more shim.

**3. System-level control, which has no R3F analogue at all.** IWSDK systems are named, registered, priority-ordered, and individually pausable. `ecs_list_systems` and `ecs_toggle_system` let an agent ask "pause the manipulation system and see what breaks." R3F's equivalent is `useFrame` callbacks scattered across components with no registry. These are the two tools Path B cannot reach by any route.

Plus the obvious: alignment with Meta's ongoing investment, first-class support in the tooling it was designed for, and no shim of ours to maintain against an unversioned `FRAMEWORK_MCP_RUNTIME` contract.

## What it would take

There is no incremental route. R3F's reconciler and IWSDK's `World` both want to own the scene graph and the render loop; they cannot cohabit. This is a rewrite with a flag day.

| Phase | Work |
|---|---|
| **0** | Scaffold `npm create @iwsdk@latest`. Port one lab (Selection — simplest) as a spike. Establish ECS patterns for what are currently hooks. **Go/no-go gate.** |
| **1** | Core scaffolding: shell, lab routing, XR session, theme system. `src/config/playgroundTheme.ts` and `PlaygroundThemeContext` are React-shaped and need a non-React equivalent. |
| **2** | Port Selection, Placement, Locomotion. Rewrite feedback layer (`useConfirmTone`, `useHapticPulse`). |
| **3** | Port Manipulation — the hard one. `useManipulation.ts`, `useHandJoints.ts`, VHI/VHS DOF-separation, docking trials, zen mode. This is the repo's most research-load-bearing code. |
| **4** | Rebuild the tuning surface. Leva is a React library; IWSDK has no equivalent, so live parameter tuning — central to the research workflow — needs a new home. |
| **5** | Rebuild director mode (`DirectorCamera`, `conceptB.ts`, presets) and the capture workflow. |
| **6** | Quest re-validation of everything. |

**Estimate: 8–14 weeks**, single developer. Roadmap Phase 4 (spatial polish, in progress) and Phase 5 (interaction platform) are blocked or discarded for the duration.

> **Estimate basis differs from the companion brief.** This figure is solo human developer work. [Path B](./agent-harness-brief.md) has since been re-estimated for agent-driven implementation (~1.5–2 agent-days). Path A would compress under the same treatment — a large share of it is mechanical porting — but proportionally *less*, because its residual cost is concentrated in things agents don't shorten: architectural decisions in an unfamiliar paradigm, judgment calls when porting research-load-bearing manipulation code, and Quest re-validation of every ported lab. A rough guess is 3–6 weeks rather than 8–14, but that number has not had a real pass and should not be quoted as one. If Path A is seriously considered, re-estimate it properly first — the comparison below is directionally right either way, since the gap is orders of magnitude, not percentages.

### The collateral nobody counts

A rewrite of `src/` is not the whole bill. These also lose validity:

- **`docs/pitfalls.md`** — a hard-won catalog of R3F, drei `Text`, and Leva footguns. Mostly becomes irrelevant, and a fresh equivalent gets earned the same painful way.
- **`docs/style-templates/`** and the **`docs/design-handoff/` bundle** — the UI kit is React (`App.jsx`, `HUDPanel.jsx`, `LevaPanel.jsx`).
- **`docs/visual-capture.md`** — the URL-param contract, authored review cameras, and `capture.spec.ts` all assume the current shell.
- **`@react-three/drei`** — gone entirely. Everything it currently provides gets rebuilt or replaced.

## Why not now

**It contradicts the thesis.** [Vision](./vision.md) is explicit: *"no SDK installs, no app-store review, no platform lock-in"* and *"the same code reaches the whole device matrix"* — Quest, Vision Pro, Pico, Android XR, ARCore phones. IWSDK is Meta-authored and Quest-shaped. Adopting it as the engine trades the project's stated differentiator for tooling we can get 75% of by other means.

The audience argument compounds this. Vision names researchers and designers alongside developers, and bets on the web stack because collaborators are "productive in minutes." An imperative ECS is a materially higher barrier than declarative R3F for the non-developer half of that audience.

**The cost/benefit is lopsided.** Path B delivers the interaction-driving capability — the actual gap — in ~1.5–2 agent-days with zero changes to `src/labs/**`. Path A additionally delivers 8 more tools and an engine, for a multi-month rewrite that stops roadmap progress. Framed bluntly: **we would be trading the project's thesis for 8 debugging tools and an engine we have mostly already built.**

**The timing is wrong.** Phase 4 is mid-flight with Quest validation outstanding. Phase 3's manipulation work — the repo's most valuable research output — would be the hardest thing to port and the easiest to regress.

## What would change the answer

This brief should be reopened if any of these become true:

1. **Path B's shim proves insufficient in practice** — if Phase 3 of the agent-harness work shows agents repeatedly blocked on reflective state access or system-level control, the 8-tool gap is real rather than theoretical.
2. **Physics becomes a requirement.** If Roadmap Phase 5/6 needs real rigid-body simulation, "adopt Havok" and "adopt IWSDK" start converging, and the incremental cost of Path A drops sharply.
3. **Cross-device reach stops being load-bearing.** If the project consciously narrows to Quest-first, the central objection evaporates.
4. **IWSDK ships a React binding.** A declarative layer over the ECS would remove both the rewrite cost and the accessibility objection at once. Worth watching — the SDK is young (0.4.2) and moving fast.
5. **A green-field sibling project appears.** IWSDK is a strong choice for something *starting today*. The argument against it here is migration cost and thesis conflict, not quality — this is a good SDK we are declining for situational reasons.

## Recommendation

Do not migrate. Take [Path B](./agent-harness-brief.md) now, and revisit this brief at the end of Roadmap Phase 5 or when any trigger above fires.

If leadership wants Path A regardless, the minimum responsible version is **Phase 0 only**: scaffold a starter, port Selection Lab, and measure the real port cost against the estimate before committing to Phases 1–6. That spike is ~1 week and produces a defensible number instead of this document's range.
