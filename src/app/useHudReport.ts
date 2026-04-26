import { useEffect, type DependencyList } from 'react'
import { defaultHudReport, usePlaygroundStore, type HudReport } from './store'

/**
 * Push a HudReport snapshot to the store while the calling lab is mounted, and
 * reset to defaults on unmount. The store write is gated by `deps` (the report
 * object is rebuilt every render, but we only re-publish when its inputs change).
 */
export function useHudReport(report: HudReport, deps: DependencyList) {
  const setHudReport = usePlaygroundStore((s) => s.setHudReport)
  useEffect(() => {
    setHudReport(report)
    return () => setHudReport(defaultHudReport)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setHudReport, ...deps])
}
