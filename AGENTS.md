# XR Interaction Playground

Read these first when you need project context:

- `docs/overview.md` for architecture and system behavior
- `docs/roadmap.md` for current priorities and planned work
- `docs/pitfalls.md` for bugs and footguns already encountered
- `src/config/labs.ts` for the lab registry and routing

Working norms:

- Prefer small, focused changes that match existing patterns in touched files.
- Keep canonical project knowledge in repo docs rather than tool-specific config.
- Before changing custom Leva plugins, drei `Text` layout, or geometry driven by Leva values, read `docs/pitfalls.md`.
- Treat shared plans as repo docs when they should be reviewed or preserved; keep personal scratch planning out of git.
