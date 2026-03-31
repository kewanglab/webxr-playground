import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { usePlaygroundStore, type SessionLogEntry } from '../app/store'
import { labs } from '../config/labs'
import { xrStore } from '../xr/core/xrStore'
import { postLogEntriesToDesktop, postLogEntryToDesktop } from './sessionLogSync'

const panelButton: CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #555',
  borderRadius: 6,
  background: '#1a1a1a',
  color: '#ddd',
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'system-ui, sans-serif',
}

const tabButton = (active: boolean): CSSProperties => ({
  ...panelButton,
  flex: 1,
  borderColor: active ? '#6b7280' : '#3f3f46',
  background: active ? '#27272a' : '#18181b',
  color: active ? '#fafafa' : '#a1a1aa',
  fontWeight: active ? 600 : 400,
})

const inputBase: CSSProperties = {
  width: '100%',
  marginBottom: 8,
  padding: 10,
  background: '#111827',
  color: '#e5e7eb',
  border: '1px solid #374151',
  borderRadius: 6,
  fontSize: 14,
  fontFamily: 'system-ui, sans-serif',
}

type LoggerTab = 'log' | 'notes'

export function TestLoggerPanel() {
  const currentLab = usePlaygroundStore((s) => s.currentLab)
  const addLogEntry = usePlaygroundStore((s) => s.addLogEntry)
  const updateLogEntryNote = usePlaygroundStore((s) => s.updateLogEntryNote)
  const logEntries = usePlaygroundStore((s) => s.logEntries)

  const [tab, setTab] = useState<LoggerTab>('log')
  const [inputSource, setInputSource] = useState<'controller' | 'hand' | 'mixed'>('controller')
  const [note, setNote] = useState('')
  const [desktopStatus, setDesktopStatus] = useState<string>('not synced')
  const [desktopPath, setDesktopPath] = useState<string>('logs/session-notes.json')
  const [isSyncing, setIsSyncing] = useState(false)

  const prevXrModeRef = useRef(xrStore.getState().mode)

  useEffect(() => {
    const id = window.setInterval(() => {
      const mode = xrStore.getState().mode
      const prev = prevXrModeRef.current
      if (prev != null && mode == null) {
        const entries = usePlaygroundStore.getState().logEntries
        if (entries.some((e) => e.fromHeadset)) {
          setTab('notes')
        }
      }
      prevXrModeRef.current = mode
    }, 250)
    return () => window.clearInterval(id)
  }, [])

  async function persistEntryToDesktop(entry: SessionLogEntry) {
    setIsSyncing(true)
    try {
      const payload = await postLogEntryToDesktop(entry)
      if (payload.path) setDesktopPath(payload.path)
      setDesktopStatus(`synced (${payload.count ?? 0})`)
    } catch (error) {
      setDesktopStatus(
        `sync failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    } finally {
      setIsSyncing(false)
    }
  }

  async function syncAllToDesktop() {
    setIsSyncing(true)
    try {
      const entries = usePlaygroundStore.getState().logEntries
      const payload = await postLogEntriesToDesktop(entries)
      if (payload.path) setDesktopPath(payload.path)
      setDesktopStatus(`synced all (${payload.count ?? 0})`)
    } catch (error) {
      setDesktopStatus(
        `sync failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      )
    } finally {
      setIsSyncing(false)
    }
  }

  const onSave = () => {
    const mode = xrStore.getState().mode
    const entry: SessionLogEntry = {
      id: crypto.randomUUID(),
      labId: currentLab,
      mode,
      inputSource,
      note,
      timestamp: new Date().toISOString(),
    }
    addLogEntry(entry)
    void persistEntryToDesktop(entry)
    setNote('')
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 420,
        maxHeight: 'calc(100vh - 32px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'rgba(10, 10, 14, 0.85)',
        border: '1px solid #2f2f38',
        borderRadius: 8,
        padding: 12,
        color: '#d1d5db',
        fontFamily: 'system-ui, sans-serif',
        zIndex: 10,
      }}
    >
      <div style={{ fontSize: 13, marginBottom: 8, color: '#9ca3af' }}>
        Session Logger ({labs.find((l) => l.id === currentLab)?.name})
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexShrink: 0 }}>
        <button type="button" style={tabButton(tab === 'log')} onClick={() => setTab('log')}>
          New log
        </button>
        <button type="button" style={tabButton(tab === 'notes')} onClick={() => setTab('notes')}>
          Session notes
        </button>
      </div>

      {tab === 'log' && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ fontSize: 12, marginBottom: 10, color: '#6b7280', lineHeight: 1.4 }}>
            Add an entry from the browser. This tab stays open after you click Log — switch to{' '}
            <span style={{ color: '#9ca3af' }}>Session notes</span> to edit headset logs or sync
            everything to disk.
          </div>

          <label style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Input Source</label>
          <select
            value={inputSource}
            onChange={(e) => setInputSource(e.target.value as 'controller' | 'hand' | 'mixed')}
            style={inputBase}
          >
            <option value="controller">Controller</option>
            <option value="hand">Hand</option>
            <option value="mixed">Mixed</option>
          </select>

          <label style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>Quick Note</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="e.g. hand pinch misses on small targets"
            style={inputBase}
          />

          <button
            type="button"
            style={{ ...panelButton, alignSelf: 'flex-start', flexShrink: 0 }}
            onClick={onSave}
            disabled={isSyncing}
          >
            Log
          </button>
        </div>
      )}

      {tab === 'notes' && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <button
            type="button"
            style={{ ...panelButton, width: '100%', marginBottom: 10, flexShrink: 0 }}
            onClick={() => void syncAllToDesktop()}
            disabled={!logEntries.length || isSyncing}
          >
            Sync to Desktop
          </button>

          <div style={{ fontSize: 12, marginBottom: 10, color: '#6b7280', lineHeight: 1.4 }}>
            Edit notes below, then Sync to Desktop to update{' '}
            <code style={{ fontSize: 11 }}>logs/session-notes.json</code>. After you leave XR, this
            tab opens automatically if you logged anything from the headset.
          </div>

          {logEntries.length === 0 ? (
            <div
              style={{
                flex: 1,
                border: '1px dashed #374151',
                borderRadius: 8,
                padding: 20,
                textAlign: 'center',
                color: '#6b7280',
                fontSize: 13,
              }}
            >
              No entries yet. Use Log in XR or the New log tab.
            </div>
          ) : (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, flexShrink: 0 }}>
                {logEntries.length} {logEntries.length === 1 ? 'entry' : 'entries'} (newest first)
              </div>
              <div
                style={{
                  overflowY: 'auto',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  paddingRight: 4,
                }}
              >
                {[...logEntries]
                  .reverse()
                  .map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        background: '#111827',
                        border: '1px solid #374151',
                        borderRadius: 6,
                        padding: 8,
                      }}
                    >
                      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                        {new Date(entry.timestamp).toLocaleString()} ·{' '}
                        {labs.find((l) => l.id === entry.labId)?.name ?? entry.labId} ·{' '}
                        {entry.mode ?? '—'} · {entry.inputSource}
                        {entry.fromHeadset ? (
                          <span style={{ color: '#22c55e', marginLeft: 6 }}>· headset</span>
                        ) : null}
                      </div>
                      <textarea
                        value={entry.note}
                        onChange={(e) => updateLogEntryNote(entry.id, e.target.value)}
                        rows={2}
                        placeholder="Add your observation…"
                        style={{ ...inputBase, marginBottom: 0 }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid #2f2f38',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 12, color: '#9ca3af' }}>Desktop: {desktopStatus}</div>
        <div style={{ marginTop: 2, fontSize: 11, color: '#6b7280', wordBreak: 'break-all' }}>
          {desktopPath}
        </div>
      </div>
    </div>
  )
}
