import { useState } from 'react'
import { useControls } from 'leva'
import { useHudReport } from '../../app/useHudReport'
import { readLevaNumber } from '../../ui/levaPlugins/readLevaNumber'
import { logTrialResult, useTrialRunner } from '../../xr/interactions/evaluation'
import { usePlaygroundTheme } from '../../xr/theme/PlaygroundThemeContext'
import { Text } from '../../xr/visual/XRText'
import { LabHeading } from '../LabHeading'

/**
 * TemplateLab — the reference implementation of this repo's lab contract.
 *
 * NOT registered in `src/config/labs.ts`, so it never renders in the app; it
 * exists so `tsc` keeps it honest and so the lab-scaffold skill (and human
 * contributors) copy a working example instead of inventing structure.
 *
 * To turn this into a real lab (the three-file contract, see README):
 *   1. Add an entry to `src/config/labs.ts` (id, name, mode, ≤9-word description)
 *      and put default tuning values in `tuningPresets`.
 *   2. Copy this file to `src/labs/<vr|ar|cross-xr>/YourLab.tsx`; one component
 *      per file, filename matches the default export.
 *   3. Add the case to `src/app/LabContent.tsx`.
 *
 * Contract checklist (each item demonstrated below):
 *   - LabHeading with the lab title + live configuration subtitle
 *   - Theme tokens from `usePlaygroundTheme()` — never hardcoded hex
 *   - Leva controls for every tunable, defaults from config, `readLevaNumber`
 *     for numeric reads (see docs/pitfalls.md before custom plugins)
 *   - `useHudReport` so the in-headset HUD mirrors the lab state (≤4 metrics)
 *   - Behavior-first interaction: pointer events, not device checks
 *     (`pointerEventsType` filters by mechanism — ray/touch/grab — never by
 *     controller-vs-hand; see docs/overview.md "Pointer types")
 *   - Optional evaluation: `useTrialRunner` + `logTrialResult` when the lab
 *     measures something; omit both for freeform feel labs
 *   - Works with controllers AND hands before the lab is "done"
 */

/** A trial definition is lab-specific — the runner never interprets it. */
type TemplateTrial = {
  /** Where the target sits for this trial (world meters). */
  position: [number, number, number]
}

/** What this lab measures per trial — also lab-specific. */
type TemplateTrialResult = {
  /** Seconds from trial start to confirm. */
  completionTimeS: number
}

const TRIALS: TemplateTrial[] = [
  { position: [-0.4, 1.3, -1.2] },
  { position: [0, 1.5, -1.2] },
  { position: [0.4, 1.3, -1.2] },
]

// Defaults belong in `src/config/labs.ts` `tuningPresets` for a real lab;
// inlined here so the template is self-contained.
const DEFAULT_TARGET_SIZE = 0.18

export function TemplateLab() {
  const { xr, labAccents } = usePlaygroundTheme()

  // One Leva folder per lab, folder name = lab name. Sliders for continuous
  // values, toggles for flags, dropdowns for categorical choices.
  const { targetSize, enableAudio } = useControls('Template', {
    targetSize: { value: DEFAULT_TARGET_SIZE, min: 0.08, max: 0.4, step: 0.02 },
    enableAudio: false,
  })
  // Leva can transiently hand back strings/undefined — normalize with a fallback,
  // and clamp size-like values so geometry can never go degenerate.
  const size = Math.max(0.08, readLevaNumber(targetSize, DEFAULT_TARGET_SIZE))

  // Evaluation plumbing (optional). advanceDelayMs holds the scene briefly
  // after each result so feedback is visible before the next trial.
  const {
    index,
    total,
    current,
    isComplete,
    records,
    recordResult,
    restart,
  } = useTrialRunner<TemplateTrial, TemplateTrialResult>({
    trials: TRIALS,
    advanceDelayMs: 400,
  })
  const [trialStartedAt, setTrialStartedAt] = useState(() => performance.now())

  // Mirror lab state into the in-headset HUD (desktop Leva is invisible in XR).
  useHudReport(
    {
      metrics: [
        { label: 'TARGET', value: size.toFixed(2) },
        { label: 'DONE', value: `${records.length}/${total}` },
        { label: 'AUDIO', value: enableAudio ? 'ON' : 'OFF' },
      ],
      methodLabel: 'Template · cross-XR',
      trial: current ? { current: index + 1, total } : null,
    },
    [size, records.length, total, enableAudio, current, index],
  )

  const confirmTarget = () => {
    const completionTimeS = (performance.now() - trialStartedAt) / 1000
    // recordResult returns false when the runner rejected the result (sequence
    // complete, or the previous trial's advance hold is still pending) — skip
    // side effects like logging and haptics in that case.
    if (!recordResult({ completionTimeS })) return
    logTrialResult({
      evaluation: 'Template',
      trialNumber: index + 1,
      trialsTotal: total,
      condition: { interaction: 'tap' },
      measures: { completionTimeS },
      inputSource: 'mixed',
    })
    setTrialStartedAt(performance.now())
  }

  return (
    <group>
      <LabHeading
        title="Template Lab"
        subtitle={`Target ${size.toFixed(2)} · Trial ${Math.min(index + 1, total)}/${total}`}
        archPosition={[0, 0, -2.5]}
      />

      {isComplete ? (
        <group position={[0, 1.4, -1.2]}>
          <Text fontSize={0.08} color={xr.hud.textPrimary} anchorX="center" anchorY="middle">
            {`Done — avg ${(
              records.reduce((s, r) => s + r.result.completionTimeS, 0) / records.length
            ).toFixed(2)}s`}
          </Text>
          {/* In-scene restart: Leva is desktop-only, so anything a headset user
              needs must exist as scene geometry. */}
          <mesh position={[0, -0.18, 0]} onPointerDown={restart}>
            <planeGeometry args={[0.4, 0.12]} />
            <meshBasicMaterial color={labAccents.selection.primary} transparent opacity={0.3} />
          </mesh>
          <Text
            position={[0, -0.18, 0.001]}
            fontSize={0.05}
            color={xr.hud.textPrimary}
            anchorX="center"
            anchorY="middle"
          >
            Restart
          </Text>
        </group>
      ) : (
        current && (
          // The interactive target. Pointer events fire for controller rays,
          // hand rays, pinches, and pokes alike — the lab responds to the
          // behavior, not the device. Restrict mechanisms only when the
          // comparison itself demands it, e.g.
          // `pointerEventsType={{ allow: 'touch' }}` for a poke-only condition.
          <mesh position={current.position} onPointerDown={confirmTarget}>
            <sphereGeometry args={[size / 2, 32, 24]} />
            <meshStandardMaterial
              color={labAccents.selection.primary}
              emissive={labAccents.selection.primary}
              emissiveIntensity={0.4}
              roughness={0.5}
            />
          </mesh>
        )
      )}
    </group>
  )
}
