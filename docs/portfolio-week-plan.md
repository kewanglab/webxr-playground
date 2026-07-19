# One-week portfolio plan

Execution plan for the remaining work from [repo-review-2026-07.md](./repo-review-2026-07.md) (tracks A/C/D — the seven review bugs are already fixed on this branch) plus the [lab-scaffold skill](./lab-scaffold-skill-plan.md), laid out over one week.

**Division of labor.** The AI agent does the implementation — each day's build block is a session kick-off, and most blocks finish in well under a day of wall-clock time. Your time (designer, some coding background) goes to the things only you can do: feeling changes in the headset, visual judgment calls, recording, license/account decisions, and reviewing what the agent produced. Budget **~1–1.5 focused hours per day** of your time; the agent absorbs the rest.

**Working rhythm each day.** Morning: kick off the agent on the day's build block (paste the day's section as the prompt). Midday/evening: do your review/validation items and hand back notes; the agent folds them in. Each day ends with a pushed branch or merged PR.

---

## Day 1 (Mon) — Validate the bug fixes on hardware, merge

The seven fixes are code-verified (typecheck, build, headless render of all four labs) but three need a human in a headset.

**You (~45 min, Quest 3):**
- Locomotion: stand a step away from where you started, snap-turn — you should rotate in place, not sweep sideways. Teleport while standing off-center — you should land *on* the waypoint.
- Docking: release the key near the target — it should visibly lock in, the "Last: X cm · Y°" readout should show your real precision, and the next trial should start back at the origin. Finish a run, tap "Restart trials."
- Manipulation with `dominantHand: left`, using your left hand.
- Placement (AR): one trigger pull → exactly one crystal (check the session log count).
- Selection: drag `confirmScaleBoost` to 0.35 and 0.05 — the click pulse should clearly differ.

**Agent:** fold in any feel notes from your pass; open and merge the PR for the review/fix branch.

**Done when:** branch merged to `main` with your headset sign-off.

## Day 2 (Tue) — Asset and repo diet (track C)

**Agent:**
- Compress the nine `xr-kit` GLBs with gltf-transform (meshopt + texture downsizing; meshopt keeps the decoder in the bundle — no CDN). Target: 67 MB → under ~5 MB.
- Replace the startup preload-everything with per-lab/per-theme lazy loading.
- Move the three source kits out of `public/assets/models/` (zip → GitHub release asset, add `npm run fetch:kits` for rebuilds); add `public/assets/README.md` documenting per-asset provenance and license.
- Draft `LICENSE` (MIT recommended for the code) pending your call.

**You (~30–45 min):**
- Eyeball the compressed models in both themes on desktop (the capture views make this fast: `?capture=scene&captureView=hero`); flag any texture that visibly degraded.
- License decisions: confirm MIT (or preference) for the code; check the MegaKit and Molten packs' terms — if they don't allow redistribution, the release-asset move becomes "private copy only" and the fetch script points at the store pages instead.

**Done when:** runtime payload under ~10 MB, working tree free of unused kits, LICENSE committed.

## Day 3 (Wed) — Trust + research value (tracks B remainder + D1/D2)

**Agent:**
- GitHub Actions CI: `tsc -b`, `vite build`, headless canvas-has-signal smoke on PRs.
- Data export: structured docking trial records (already logged as notes) get a machine-readable shape, and `logs-viewer.html` gains a **Download CSV** button.
- Shareable URLs: extend `?lab=`/`?theme=` with technique/preset params (e.g. `?lab=manipulation&technique=separated`) so a felt configuration is a pasteable link.

**You (~30 min):**
- Run one docking session, download the CSV, open it — is this the spreadsheet you'd want after a study session? Note missing columns.
- Open a shared URL on a second browser/profile and confirm it lands configured.

**Done when:** CI green on a test PR; CSV round-trip works; a shared link reproduces your setup.

## Day 4 (Thu) — Public face (track A)

Order matters today: history rewrite happens **after** all the big deletions (Day 2's kits, today's GIF) and **before** the repo is promoted anywhere.

**Agent:**
- Delete the 23 MB README GIF; run `git filter-repo` to strip large blobs from history (192 MB pack → tens of MB); re-point the docs that reference commit SHAs; force-push (coordinated with you — nothing else in flight).
- GitHub Pages deploy workflow (`base` path config, HTTPS URL); hide the log-sync button when the API is absent.
- README overhaul: live-demo link up top, real clone URL, video embed, per-lab cards with the paper citation; CONTRIBUTING + "build a lab in 3 files" tutorial.

**You (~1–1.5 h):**
- Enable Pages in repo settings (2 minutes).
- Record the demo video: run Director mode (`?director=concept-b`), screen-record, plus ~20 s of real headset footage (casting) if you can — the agent compresses and embeds. This is the single highest-leverage portfolio artifact of the week.
- Read the README top to bottom as a stranger; mark anything that overpromises.
- Open the Pages URL on the Quest and enter VR once.

**Done when:** public URL live and verified on-headset; README tells the story with the video.

## Day 5 (Fri) — Lab-scaffold skill: M0 + M1

**Agent:**
- Extract `useTrialRunner` + finalize `logTrialResult` (Day 3's export becomes the generic path); create the reference lab template.
- Author `.claude/skills/lab-scaffold/` per the [skill plan](./lab-scaffold-skill-plan.md) — both entry modes.
- Calibration run (M1): feed it the Mikkelsen DOF-separation PDF (you supply the file), generate the interaction spec, and diff the scaffold against the hand-built lab.

**You (~45 min):**
- Read the generated spec against your memory of the paper/lab: did it catch the techniques, parameters, measures? Mark anything it invented.
- Read the skill's interview questions for idea mode — are they questions you'd tolerate answering? Trim any that feel like a requirements workshop.

**Done when:** skill exists, calibration diff reviewed, follow-ups filed.

## Weekend / stretch — M2: first real runs

- **Idea mode, end to end:** you bring one sentence (e.g. "targets should gently pull the cursor when you get close"), run `/lab-scaffold`, answer the interview, review the spec, let it build, feel it on Quest that evening.
- **Paper mode on a new paper:** Go-Go or PRISM.
- Screen-record both runs — they become the README's flagship story (M3), which can land early next week.

---

## What can slip, safely

- Shareable URLs (Day 3) and CONTRIBUTING (Day 4) are the lowest-stakes items — push to the weekend if a day runs over.
- The history rewrite can slip to any point before you share the repo publicly — but not after.
- M2 is a stretch by design; the week is a success at "skill authored + calibrated."

## What must not slip

- Day 1's headset validation (everything else builds on merged fixes).
- Asset diet before deploy (Day 2 before Day 4) — nobody waits out a 67 MB load on a Quest browser.
- Rewrite-then-publish ordering on Day 4.
