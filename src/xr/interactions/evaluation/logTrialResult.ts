import { usePlaygroundStore } from '../../../app/store'
import { xrStore } from '../../core/xrStore'

export type TrialResultLog = {
  /** Short evaluation name shown in the note, e.g. "Docking". */
  evaluation: string
  /** 1-based trial number and sequence length. */
  trialNumber: number
  trialsTotal: number
  /** Independent variables for this trial (technique, acquisition, trial type, …). */
  condition: Record<string, string>
  /** Numeric measurements, keys suffixed with their unit (e.g. positionalOffsetM). */
  measures: Record<string, number>
  /** Boolean outcomes (e.g. snapped). */
  flags?: Record<string, boolean>
  inputSource?: 'controller' | 'hand' | 'mixed'
}

/**
 * Persist one trial result to the session log: a human-readable note for the
 * logger panel plus a machine-readable `data` payload (kind: 'trial-result')
 * that the logs viewer can flatten into CSV. Safe to call from render-loop
 * callbacks — reads the stores imperatively.
 */
export function logTrialResult(log: TrialResultLog): void {
  const { addLogEntry, currentLab } = usePlaygroundStore.getState()
  const condition = Object.values(log.condition).join(', ')
  const measures = Object.entries(log.measures)
    .map(([key, value]) => `${key}=${Number.isInteger(value) ? value : value.toFixed(2)}`)
    .join(', ')
  const flags = Object.entries(log.flags ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ')

  addLogEntry({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    labId: currentLab,
    mode: xrStore.getState().mode,
    inputSource: log.inputSource ?? 'hand',
    note: `${log.evaluation} trial ${log.trialNumber}/${log.trialsTotal} (${condition}): ${measures}${flags ? `, ${flags}` : ''}`,
    data: {
      kind: 'trial-result',
      evaluation: log.evaluation,
      trialNumber: log.trialNumber,
      trialsTotal: log.trialsTotal,
      ...log.condition,
      ...log.measures,
      ...(log.flags ?? {}),
    },
  })
}
