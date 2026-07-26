# Manipulation Lab (DOF-Separation) — interaction spec

> Produced by the lab-scaffold skill (paper mode) as the **M1 calibration run**:
> the spec was extracted fresh from the paper, then diffed against the
> hand-built `ObjectManipulationLab` — see Implementation status at the bottom.
> Values marked `(assumed)` were chosen by the agent, not stated by the source.

## Core interaction question

Does separating 6DOF hand movement into independent 3DOF translation and rotation controls improve manipulation accuracy and speed, and how does the benefit depend on the acquisition technique's demands on the hand?

## Source

- **Mode:** paper
- **Paper:** Mikkelsen, Zhou, Lystbæk, Liu, Gellersen, Pfeuffer. *DOF-Separation for 3D Manipulation in XR: Understanding Finger-Wrist Separation to Simultaneously Translate and Rotate Objects.* ISMAR 2025. (Uploaded PDF, 2026-07-20.)
- **Related work adopted:** MRTK/Leap shoulder-ray Hand Ray (for HRS), Pfeuffer et al. Gaze&Pinch (for GP), 1€ filter (Casiez et al.) for hand smoothing.

## Mode & staging

- **XR mode:** cross-xr — paper studied VR; techniques carry to AR passthrough unchanged.
- **Staging vocabulary:** dock station + manipulable object + ghost target (existing manipulation set).
- **Accent pair:** `labAccents.manipulation` primary/secondary.
- **Object:** paper uses a 12.5 cm semi-transparent cube inscribing an opaque Stanford bunny, spawned 50 cm in front of chest level. Any asymmetric object where orientation reads clearly satisfies the requirement (the bunny's role is *visible orientation*, not bunny-ness).

## Techniques / conditions

3 Input-Metaphors × 2 DOF-Separation levels = 6 techniques. Trial = single gesture: starts when the object appears, ends on pinch release; no accuracy threshold, no clutching.

| Condition | What the user does | WebXR mapping | Feasibility |
|---|---|---|---|
| VHI (Virtual Hand, integrated) | Pinch on the object; 1:1 6DOF mapping from **thumb tip** (position + orientation, pivot at pinch point) | hand joints: `thumb-tip`; pinch = `selectstart`/`selectend` | ok |
| VHS (Virtual Hand, separated) | Pinch on the object; translation from **wrist** position delta; rotation from thumb orientation delta, egocentric (about object centre). Requirement: object stays at pinch point when the hand only translates | hand joints: `wrist` + `thumb-tip` | ok |
| HRI (Hand Ray, integrated) | Pinch at distance via wrist-based ray; "stick" metaphor — ray rigid on pinch, wrist flexion displaces the object, pronation/supination rolls it through the acquisition point | hand joints + custom ray math (not the framework ray pointer) | ok — not yet implemented (deferred; roadmap HRI/HRS) |
| HRS (Hand Ray, separated) | Pinch at distance via shoulder-stabilised ray (origin: midpoint of estimated shoulder and wrist, aimed through hand); hand orientation → egocentric rotation only; ray rendered | hand joints + estimated shoulder (offset from head pose `(assumed)` — no body tracking) | ok — not yet implemented (deferred) |
| GPI (Gaze&Pinch, integrated) | Look at object, pinch anywhere; 6DOF thumb mapping; curved-disc hand indicator on hover | **eye tracking unavailable** | approximated: head-gaze (camera forward ray) — must be labeled in subtitle — or cut |
| GPS (Gaze&Pinch, separated) | As GPI with wrist translation + egocentric rotation | same | same approximation or cut |

Translation mapping for HR and GP: visual-angle-based — the object travels the same angular distance around the user as the hand (paper §3.2).

Scope cuts (current implementation): HRI/HRS deferred to a dedicated lab (roadmap Phase 6); Gaze&Pinch cut until eye tracking or an explicitly-labeled head-gaze approximation is chosen.

## Parameters (→ Leva schema, verbatim)

| Param | Default | Min | Max | Step | Unit | Notes |
|---|---|---|---|---|---|---|
| technique | integrated | — | — | — | — | dropdown: integrated / separated |
| objectSize | 0.125 | 0.05 | 0.3 | 0.01 | m | paper: 12.5 cm cube side |
| spawnDistance | 0.5 | 0.3 | 1.0 | 0.05 | m | paper: 50 cm in front of chest |
| translationOffset | 0.3 | 0.1 | 0.5 | 0.05 | m | paper: ±30 cm |
| rotationOffset | 45 | 15 | 135 | 15 | ° | paper: ±45° (R task); 45/90/135 (C task) |
| cdGain | 1.0 | 0.2 | 3.0 | 0.1 | × | paper uses 1:1 `(assumed — not explicitly stated)` |
| oneEuroMinCutoff | 1.0 | 0.1 | 5.0 | 0.1 | Hz | paper filters all tracking with 1€ `(assumed value; paper gives no coefficients)` |
| dominantHand | right | — | — | — | — | paper: dominant hand; participants all right-handed |

## Measures (→ HUD cells + logTrialResult)

- **positionalOffsetCm** — Euclidean distance object↔target centres at release
- **rotationalOffsetDeg** — angular offset at release. *Deviation:* the repo measures the geodesic (shortest-arc) quaternion angle; the paper states "aggregated along all 3 axes", i.e. a per-axis sum. Identical for single-axis trials, divergent for two-axis combined trials. Within-lab A/B comparisons are unaffected; absolute cross-study comparison to the paper's numbers is not valid without switching to the per-axis aggregate.
- **trialCompletionTimeS** — object appearance → pinch release
- **acquisitionTimeS** — object appearance → pinch down
- (NASA-TLX / preference: out of scope for the lab; capture free-text via session logger)

## Trial protocol

- **Translation (6):** target offset ±`translationOffset` along one of X/Y/Z; orientation unchanged.
- **Rotation (6):** target rotated ±`rotationOffset` about one of X/Y/Z; position unchanged (pivot at object centre).
- **Combined (18):** ±`translationOffset` along X, plus ±45/90/135° about one of X, Y, Z, XY, XZ, YZ; directions uniform random.
  - `(assumed)` For the two-axis conditions (XY, XZ, YZ) the paper's "45/90/135° along one or two axes" is read as *the offset is applied about each named axis*, so a 45° XY trial composes to ~63° of net rotation. The alternative reading (net angle held at 45° and split across two axes) is possible; this reading is consistent with the paper measuring rotational offset "aggregated along all 3 axes" — i.e. thinking per-axis rather than geodesically.
- Per condition: fixed order T → R → C; paper runs 2 repetitions (12 T + 12 R + 36 C per technique). Lab default: 1 repetition `(assumed — session length)`.
- **Target presentation:** object and target appear overlapping; target animates to its destination by linear interpolation (shows the optimal integral solution).
- Reset rule: object re-seeds at spawn pose each trial. Trial advance: on pinch release, feedback hold 650 ms `(assumed — repo convention, paper advances immediately)`.

## Human test card

- [ ] VHS vs VHI on a Combined trial with a 2-axis rotation: separated should feel meaningfully easier to land accurately (paper's headline VH finding).
- [ ] VHS: translate the object with a deliberately flexed/rotating wrist — the object should NOT drift (wrist-translation immunity).
- [ ] VHI: rotate the pinched object — it should orbit the pinch point, not spin about its own centre.
- [ ] Works with left hand via `dominantHand`.
- [ ] Pinch-detection feel: paper tuned toward early-acquisition/late-release; note any frustrating early releases in the session logger.

## Implementation status — M1 calibration diff vs. hand-built `ObjectManipulationLab`

**Faithful to the paper (validated by this extraction):**
- VHI mapping: thumb-tip 1:1 with pinch-point pivot (`techniques.ts computeIntegrated`) ✓
- VHS mapping: wrist-delta translation + thumb-orientation egocentric rotation ✓. The paper's *forward-offset compensation* is a mechanism for its requirement ("object remains at pinch-point absent rotation"); the repo satisfies the requirement differently (delta-based mapping from the object's own grab pose) — equivalent behavior, documented in `techniques.ts` ✓
- Object size 0.125 m ✓; translation offset ±0.3 m on all 3 axes ✓; rotation ±45° on all 3 axes ✓
- Single-gesture trial with release-ends-trial and honest offset measurement ✓ (post bug-fix)
- Measures: positional + rotational offsets ✓, per-trial logging ✓

**Justified deviations (keep, but keep them visible):**
- Key-crystal object instead of cube+bunny — satisfies the "orientation must read" requirement in the design system's language.
- Auto-snap within tolerance — a design-handoff addition; the paper has no snap. Measurements stay honest (recorded pre-snap), so comparability holds.
- Spawn at 0.7 m in front (desk staging) vs paper's 0.5 m — worth a Leva `spawnDistance` param to allow paper-faithful replication.
- Acquisition variants (proximity pinch / framework hand ray) are a repo extension for targeting, not one of the paper's six techniques — correctly kept out of the technique axis.

**Gaps — status:**
1. ~~Time measures missing~~ **closed (2026-07-20).** `useTrialRunner` exposes `currentStartedAt`; docking captures completion time (stimulus → release) and acquisition time (stimulus → pinch down, via `onAcquire`), logs both, and shows completion time in the HUD and the release readout.
2. ~~Combined-task difficulty ladder missing~~ **closed (2026-07-20).** `generateTrials('paper')` now produces the paper's 30-trial block: 6 translation + 6 rotation + 18 combined (3 angles × 6 axis combinations, uniformly random directions). Verified at runtime: 6/6/18 with an even 6/6/6 split across 45/90/135° and all of X, Y, Z, XY, XZ, YZ present. A `quick` 6-trial subset (retaining one 135° combined trial) exists for demos. The completion screen now breaks out mean rotational offset on ≥90° combined trials — the comparison where the paper's VHS benefit appears.
3. **Target animation missing** — repo shows a static ghost; the paper animates target from overlap to destination to show the optimal solution. *Open.*
4. **No 1€ filter** — paper filters all hand tracking; repo uses raw joints. *Open.*
5. HRI/HRS and Gaze&Pinch — known scope cuts, unchanged.

**Skill-calibration verdict:** extraction recovered every technique mapping, all task geometry, and both accuracy measures that the hand-built lab implements, plus four real gaps the lab review had not itemized (1–4 above). One systematic lesson fed back into the skill: distinguish a paper's *requirements* from its *mechanisms* when judging fidelity (the forward-offset case).
