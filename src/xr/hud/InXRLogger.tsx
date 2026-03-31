import { Text } from '@react-three/drei'
import { useState } from 'react'
import { usePlaygroundStore } from '../../app/store'
import { postLogEntriesToDesktop } from '../../ui/sessionLogSync'
import { xrStore } from '../core/xrStore'
import { HUDButton } from './HUDButton'

/**
 * One-tap log from the headset: append in memory and replace desktop JSON with the full list.
 */
export function InXRLogger() {
  const currentLab = usePlaygroundStore((s) => s.currentLab)
  const addLogEntry = usePlaygroundStore((s) => s.addLogEntry)
  const logEntries = usePlaygroundStore((s) => s.logEntries)
  const [status, setStatus] = useState('')

  const onLog = () => {
    const mode = xrStore.getState().mode
    const entry = {
      id: crypto.randomUUID(),
      labId: currentLab,
      mode,
      inputSource: 'mixed' as const,
      note: '(headset quick log)',
      timestamp: new Date().toISOString(),
      fromHeadset: true,
    }
    addLogEntry(entry)
    void (async () => {
      try {
        const entries = usePlaygroundStore.getState().logEntries
        const p = await postLogEntriesToDesktop(entries)
        setStatus(`${p.count ?? entries.length} on disk`)
      } catch (e) {
        setStatus(e instanceof Error ? e.message : 'sync failed')
      }
    })()
  }

  return (
    <group position={[0, -0.07, 0]}>
      <HUDButton label="Log" position={[0, 0, 0]} width={0.29} onPress={onLog} />
      <Text
        position={[0, -0.058, 0]}
        fontSize={0.02}
        color="#cbd5e1"
        anchorX="center"
        anchorY="middle"
        maxWidth={0.42}
        outlineWidth={0.0025}
        outlineColor="#020617"
      >
        {`entries: ${logEntries.length}${status ? ` · ${status}` : ''}`}
      </Text>
    </group>
  )
}
