import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * One recorded trial: the trial definition plus whatever the lab measured.
 * `TTrial` and `TResult` are lab-defined — the runner never interprets them.
 */
export type TrialRecord<TTrial, TResult> = {
  trial: TTrial
  result: TResult
}

export type UseTrialRunnerOptions<TTrial> = {
  /** Ordered trial definitions. Treated as immutable for the run's lifetime. */
  trials: TTrial[]
  /**
   * Hold time (ms) after a result is recorded before advancing to the next
   * trial — gives the participant a beat to see feedback (e.g. a docking snap)
   * before the scene resets. `0` advances immediately.
   */
  advanceDelayMs?: number
}

/**
 * Generic trial sequencing for evaluation-style labs (graduated from
 * DockingMode): current-trial tracking, result collection, a feedback hold
 * before advancing, and restart. Labs own what a trial *is* and what gets
 * measured; the runner owns the sequence.
 *
 * `recordResult` returns `false` when the result was not accepted (sequence
 * complete, or a previous result's advance hold is still pending) — callers
 * should skip their own side effects (logging, haptics, snap poses) in that
 * case, mirroring the runner's re-entry guard.
 */
export function useTrialRunner<TTrial, TResult>({
  trials,
  advanceDelayMs = 0,
}: UseTrialRunnerOptions<TTrial>) {
  const [index, setIndex] = useState(0)
  const [records, setRecords] = useState<TrialRecord<TTrial, TResult>[]>([])
  const [lastRecord, setLastRecord] = useState<TrialRecord<TTrial, TResult> | null>(null)
  const advanceTimerRef = useRef<number | null>(null)
  // `performance.now()` at the moment the current trial became active — i.e.
  // when its stimulus appears, which is the start point for completion-time
  // and acquisition-time measures.
  const [currentStartedAt, setCurrentStartedAt] = useState(() => performance.now())

  useEffect(
    () => () => {
      if (advanceTimerRef.current != null) window.clearTimeout(advanceTimerRef.current)
    },
    [],
  )

  const current = trials[index] ?? null
  const isComplete = index >= trials.length

  const recordResult = useCallback(
    (result: TResult): boolean => {
      if (advanceTimerRef.current != null) return false
      if (current == null) return false
      const record: TrialRecord<TTrial, TResult> = { trial: current, result }
      setRecords((prev) => [...prev, record])
      setLastRecord(record)
      const advance = () => {
        advanceTimerRef.current = null
        setIndex((prev) => prev + 1)
        setCurrentStartedAt(performance.now())
      }
      if (advanceDelayMs > 0) {
        advanceTimerRef.current = window.setTimeout(advance, advanceDelayMs)
      } else {
        advance()
      }
      return true
    },
    [advanceDelayMs, current],
  )

  const restart = useCallback(() => {
    if (advanceTimerRef.current != null) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
    setIndex(0)
    setRecords([])
    setLastRecord(null)
    setCurrentStartedAt(performance.now())
  }, [])

  return {
    /** Zero-based index of the current trial (== trials.length when complete). */
    index,
    total: trials.length,
    /** Current trial definition, or null when the sequence is complete. */
    current,
    isComplete,
    records,
    lastRecord,
    /** `performance.now()` when the current trial's stimulus appeared. */
    currentStartedAt,
    recordResult,
    restart,
  }
}
