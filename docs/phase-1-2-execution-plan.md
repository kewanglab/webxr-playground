# Execution plan: Phase 1 (public URL) + Phase 2 (agent harness core)

**Status:** Ready to execute. Parent: [Executive roadmap](./executive-roadmap.md). Phase 2 implements Phases 0–2 of the [agent harness brief](./agent-harness-brief.md).

**Parallelization:** Yes — run these as two independent agent sessions on two branches cut from `main`. They share no product-code files. The only overlap is `package.json` / `package-lock.json` (both) and potentially `vite.config.ts` (Phase 2 adds a plugin; Phase 1 is deliberately scoped to *avoid* editing it — see task 1.2). Merge protocol at the bottom.

| | Branch (suggested) | Agent cost | Human cost | Gate |
|---|---|---|---|---|
| Phase 1 | `claude/phase1-public-url` | 1–2 days | ~1 h | none |
| Phase 2 | `claude/phase2-agent-harness` | 0.5–1 day | ~45 min | Vite 8 spike (task 2.1) |

---

## Phase 1 — Ship the public URL

**Goal:** `https://kewanglab.github.io/webxr-playground/` loads on desktop and Quest, enters VR/AR, and deep links (`?lab=manipulation`) work. No terminal required for visitors.

### Tasks

**1.1 — LICENSE** *(human decision required)*
Add `LICENSE` at repo root. Default recommendation: **MIT** (maximum remix-friendliness, matches the vision's "open" framing). Apache-2 if patent grant matters to the org. The agent should stub MIT and flag the choice in the PR description.

**1.2 — Pages deploy workflow** (`.github/workflows/deploy-pages.yml`)
On push to `main`: checkout → `npm ci` → `npx vite build --base=/webxr-playground/` → upload `dist/` → `actions/deploy-pages`.
**Deliberately pass `--base` as a CLI flag instead of editing `vite.config.ts`** — keeps local dev untouched and keeps this branch conflict-free with Phase 2.

**1.3 — Fix absolute asset paths**
`src/xr/visual/useKitModel.tsx:13` hardcodes `XR_KIT_BASE_PATH = '/assets/models/xr-kit/'`, which 404s under a subpath base. Prefix with `import.meta.env.BASE_URL`. Audit for any other absolute `/assets/`, `/audio/`, or `/logs-viewer.html` references (including in `index.html` and CSS).

**1.4 — Prune the deploy artifact**
`public/assets` is 134 MB (the raw Kenney kit, all formats). Determine what the app actually fetches at runtime (the merged `xr-kit` GLBs from `build:xr-kit`, textures, audio) and exclude the rest **in the workflow's artifact step** — not by deleting from the repo. Target: deploy artifact well under ~30 MB so first load on Quest Wi-Fi is tolerable.

**1.5 — Session logger graceful degradation**
`/api/logs` is dev-server middleware (`configureServer` in `vite.config.ts`) and does not exist on static hosting. In `src/ui/sessionLogSync.ts` / `TestLoggerPanel.tsx`: detect sync failure (or `import.meta.env.PROD` + first 404), fall back to in-memory/localStorage-only logging, and show a "local only — desktop sync unavailable" state instead of an error. Do not remove the dev workflow.

**1.6 — Verify deep links**
`?lab=` and `?theme=` already exist (`src/app/store.ts`). Verify they survive the base path and document them in the README. Parameter-level deep links (`?cdGain=`) are **out of scope** — that's Phase 5 territory.

**1.7 — README quickstart rewrite**
Lead with the live URL ("open this on your headset — that's the install"); demote the clone/`npm run dev` path to a "Local development" section. Keep `adb reverse` notes for the dev loop.

### Acceptance criteria

1. Live URL loads on desktop Chrome and Quest Browser; VR and AR entry both work.
2. All four labs render and are interactive from the hosted build.
3. `?lab=manipulation&theme=warm-night`-style links work hosted.
4. Session logger degrades gracefully (no console errors, clear local-only state).
5. `npm run dev`, `npm run capture:screenshots`, `npm run test:visual` unchanged.

### Human actions (cannot be delegated)

- Settings → Pages → Source: **GitHub Actions** (repo admin).
- Confirm the repo is public (Pages from a private repo needs a paid plan; the site is public either way).
- Ratify the license choice.
- Final on-headset smoke test of the live URL.

---

## Phase 2 — Agent harness core (brief Phases 0–2)

**Goal:** an agent can move the emulated headset/hands, pinch, pull triggers, screenshot from inside the session, and read the console — with zero changes to `src/labs/**`.

### Tasks

**2.1 — Vite 8 spike** *(gate — do first, on a throwaway branch)*
`@iwsdk/vite-plugin-dev` peer-declares `vite ^7.0.0`; repo is on `^8.0.2`. Install, boot the dev server, confirm the MCP endpoint and IWER injection work. If it genuinely breaks (not just a peer warning), **stop and report** — the workaround research (patch/fork/pin Vite 7) could exceed the rest of the plan and needs a human decision.

**2.2 — Plugin integration**
Add `iwsdkDev({ ai: { mode: 'agent', tools: ['claude'] } })` to `vite.config.ts` plugins. Set `emulate: false` in `src/xr/core/xrStore.ts` so the plugin's IWER owns emulation deterministically. Re-evaluate the 45-line DevUI-hiding hack in `src/app/App.tsx:58–105` — if the plugin's emulation makes it obsolete, remove it; if not, document why it stays. Keep generated MCP config files (`.mcp.json` etc.) thin per `AGENTS.md`.

**2.3 — `FRAMEWORK_MCP_RUNTIME` shim** (~150 lines, new file under `src/xr/core/` or `src/dev/`)
- `scene_get_hierarchy`, `scene_get_object_transform` — walk the R3F `Object3D` graph.
- `ecs_pause` / `ecs_resume` / `ecs_step` — `frameloop="never"` + `advance()`.
- Partial `ecs_query_entity` / `ecs_set_component` — mapped onto the zustand stores and Leva params (build speculatively; delete what goes unused).
- Dev-only: the shim must be excluded from production builds (guard with `import.meta.env.DEV`), so it can never collide with Phase 1's hosted bundle.

### Acceptance criteria

1. An agent completes a grab-move-release in the Manipulation Lab and screenshots the result from the emulated headset POV, in one turn, with no spec-file edits.
2. Zero diffs under `src/labs/**`.
3. `npm run capture:screenshots` and `npm run test:visual` still pass.
4. Shim is absent from `vite build` output.

### Human actions

- ~15 min review at the 2.1/2.2 boundary (including the DevUI-hack decision).
- ~30 min review of the shim surface.

**Note:** the brief's Phases 3–4 (per-lab interaction tests, Playwright lifecycle deconfliction) are **Phase 3 of the executive roadmap** — a follow-up branch after this one merges, not part of this session.

---

## Coordination & merge protocol

1. Both branches cut from current `main`. Neither depends on the other.
2. **Expected conflicts:** `package-lock.json` always (both branches `npm install`); `package.json` trivially. `vite.config.ts` conflicts only if Phase 1 violates task 1.2's constraint — don't.
3. **Merge order: whichever finishes first wins.** The second branch rebases onto `main`, resolves `package.json` by keeping both changes, and regenerates the lockfile with `npm install` rather than hand-merging it.
4. After both land: confirm the hosted build still passes acceptance 1.1–1.5 (Phase 2's plugin is dev-only and should be invisible in production — acceptance 2.4 checks this).

### Ready-to-paste agent prompts

**Agent A (Phase 1):**
> On branch `claude/phase1-public-url`, implement Phase 1 of `docs/phase-1-2-execution-plan.md` (tasks 1.1–1.7). Do not edit `vite.config.ts` — pass `--base` in the workflow instead. Verify acceptance criteria 1–5 locally (`vite build --base=/webxr-playground/ && vite preview` to simulate the subpath), commit, and push. Flag the license choice and the list of pruned assets in your summary.

**Agent B (Phase 2):**
> On branch `claude/phase2-agent-harness`, implement Phase 2 of `docs/phase-1-2-execution-plan.md` (tasks 2.1–2.3), which is Phases 0–2 of `docs/agent-harness-brief.md`. Task 2.1 is a gate: if `@iwsdk/vite-plugin-dev` fails on Vite 8 beyond peer warnings, stop and report findings instead of working around it. Prove acceptance criterion 1 by actually driving a grab-move-release yourself and attaching the screenshot. Commit and push.
