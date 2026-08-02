# XR Interaction Playground

**You can run this app and see your own change working — you do not have to guess.**
`npm run dev:agent` boots an emulated Quest 3 with a headless browser you control:
move the headset and hands, pinch to grab, screenshot from inside the session, and
query the live scene graph for where things actually are.

```bash
npm run dev:agent                                   # leave running
node scripts/xr-agent.mjs get_session_status
node scripts/xr-agent.mjs ecs_find_entities '{"namePattern":"ExtrudeGeometry"}'
node scripts/xr-agent.mjs screenshot --out /tmp/look.png
```

Read `docs/agent-harness.md` before driving it — especially **Known characteristics**,
which covers three things that will otherwise waste your time: a driven release is
imprecise by design, pausing stops rendering, and labs re-apply hand config on mount.
`npm run dev` is unaffected by any of this.

Read these first when you need project context:

- `docs/vision.md` for the long-horizon "why" — audience, mix-and-match, agentic harness, future modalities
- `docs/overview.md` for architecture and system behavior
- `docs/roadmap.md` for current priorities and planned work
- `docs/pitfalls.md` for bugs and footguns already encountered
- `docs/style-templates/` for 2D shell vs 3D XR visual specs (tokens, components, lighting budget)
- `src/config/labs.ts` for the lab registry and routing
- `src/labs/LabHeading.tsx` + `getLabTitle()` for consistent in-scene lab titles (name) and subtitles (configuration)
- `src/labs/_template/TemplateLab.tsx` for the reference lab contract (typechecked, not registered)
- `.claude/skills/lab-scaffold/` to scaffold a new lab from a paper or an idea — spec first, then the three-file contract
- `src/xr/interactions/evaluation/` for trial sequencing (`useTrialRunner`) and structured result logging (`logTrialResult`)
- `docs/agent-harness.md` to drive the app yourself — `npm run dev:agent` gives you an emulated headset, hands, screenshots and scene queries over `scripts/xr-agent.mjs`

Working norms:

- Prefer small, focused changes that match existing patterns in touched files.
- Keep canonical project knowledge in repo docs rather than tool-specific config.
- Before changing custom Leva plugins, drei `Text` layout, or geometry driven by Leva values, read `docs/pitfalls.md`.
- Prefer driving the app over reasoning about it. Interaction changes (grab, select, locomotion, placement) are cheap to verify with `npm run dev:agent` and expensive to get wrong by inspection.
- When you drive an interaction, assert on what the app recorded — `hudReport`, trial counters, `logEntries` — not on the screenshot alone. A frame can look right while the measurement is wrong.
- Treat shared plans as repo docs when they should be reviewed or preserved; keep personal scratch planning out of git.
