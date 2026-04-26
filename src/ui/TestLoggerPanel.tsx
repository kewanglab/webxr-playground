import type { CSSProperties } from 'react'
import { useEffect, useRef, useState } from 'react'
import { usePlaygroundStore, type SessionLogEntry } from '../app/store'
import { labs } from '../config/labs'
import { xrStore } from '../xr/core/xrStore'
import { postLogEntriesToDesktop, postLogEntryToDesktop } from './sessionLogSync'
import { LoggerLevaTitleBar, loggerLevaPanelShell } from './loggerLevaChrome'

const v = (name: string) => `var(${name})`

const panelButton: CSSProperties = {
  padding: `${v('--pg-shell-space-sm')} ${v('--pg-shell-space-lg')}`,
  border: `1px solid ${v('--pg-shell-border-default')}`,
  borderRadius: v('--pg-shell-radius-md'),
  background: v('--pg-shell-bg-subtle'),
  color: v('--pg-shell-text-primary'),
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: v('--pg-shell-font-ui'),
}

const tabButton = (active: boolean): CSSProperties => ({
  ...panelButton,
  flex: 1,
  borderColor: active ? v('--pg-shell-accent-primary') : v('--pg-shell-border-subtle'),
  background: active ? v('--pg-shell-accent-soft') : v('--pg-shell-bg-elevated'),
  color: active ? v('--pg-shell-text-primary') : v('--pg-shell-text-muted'),
  fontWeight: active ? 600 : 400,
})

const inputBase: CSSProperties = {
  width: '100%',
  marginBottom: v('--pg-shell-space-sm'),
  padding: v('--pg-shell-space-md'),
  background: v('--pg-shell-bg-canvas'),
  color: v('--pg-shell-text-primary'),
  border: `1px solid ${v('--pg-shell-border-default')}`,
  borderRadius: v('--pg-shell-radius-md'),
  fontSize: 14,
  fontFamily: v('--pg-shell-font-ui'),
}

type LoggerTab = 'log' | 'notes'

export function TestLoggerPanel() {
  const currentLab = usePlaygroundStore((s) => s.currentLab)
  const addLogEntry = usePlaygroundStore((s) => s.addLogEntry)
  const updateLogEntryNote = usePlaygroundStore((s) => s.updateLogEntryNote)
  const logEntries = usePlaygroundStore((s) => s.logEntries)

  const [expanded, setExpanded] = useState(false)
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
          setExpanded(true)
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

  const labName = labs.find((l) => l.id === currentLab)?.name ?? currentLab

  return (
    <div
      style={{
        flex: expanded ? 1 : '0 0 auto',
        minHeight: expanded ? 0 : undefined,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        pointerEvents: 'auto',
      }}
    >
      {!expanded ? (
        <div style={loggerLevaPanelShell()}>
          <LoggerLevaTitleBar
            open={false}
            title="Session log"
            showBottomBorder={false}
            ariaLabel="Expand session logger panel"
            onToggle={() => setExpanded(true)}
          />
        </div>
      ) : (
        <div
          id="session-logger-panel"
          role="region"
          aria-label={`Session logger, ${labName}`}
          style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: v('--pg-shell-text-primary'),
            fontFamily: v('--pg-shell-font-ui'),
            ...loggerLevaPanelShell(),
          }}
        >
          <LoggerLevaTitleBar
            open
            title={`Session log · ${labName}`}
            ariaLabel="Collapse session logger panel"
            onToggle={() => setExpanded(false)}
          />

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              padding: v('--pg-shell-space-md'),
            }}
          >
          <div
            style={{
              display: 'flex',
              gap: v('--pg-shell-space-sm'),
              marginBottom: v('--pg-shell-space-md'),
              flexShrink: 0,
            }}
          >
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
              <div
                style={{
                  fontSize: 12,
                  marginBottom: v('--pg-shell-space-sm'),
                  color: v('--pg-shell-text-muted'),
                  lineHeight: 1.4,
                }}
              >
                Add an entry from the browser. This tab stays open after you click Log — switch to{' '}
                <span style={{ color: v('--pg-shell-text-primary') }}>Session notes</span> to edit
                headset logs or sync everything to disk.
              </div>

              <label
                htmlFor="logger-input-source"
                style={{ fontSize: 13, display: 'block', marginBottom: v('--pg-shell-space-xs') }}
              >
                Input source
              </label>
              <select
                id="logger-input-source"
                value={inputSource}
                onChange={(e) => setInputSource(e.target.value as 'controller' | 'hand' | 'mixed')}
                style={inputBase}
              >
                <option value="controller">Controller</option>
                <option value="hand">Hand</option>
                <option value="mixed">Mixed</option>
              </select>

              <label
                htmlFor="logger-quick-note"
                style={{ fontSize: 13, display: 'block', marginBottom: v('--pg-shell-space-xs') }}
              >
                Quick note
              </label>
              <textarea
                id="logger-quick-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="e.g. hand pinch misses on small targets"
                style={inputBase}
              />

              <button
                type="button"
                style={{
                  ...panelButton,
                  alignSelf: 'flex-start',
                  flexShrink: 0,
                  minHeight: 40,
                }}
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
                style={{
                  ...panelButton,
                  width: '100%',
                  marginBottom: v('--pg-shell-space-sm'),
                  flexShrink: 0,
                  minHeight: 40,
                }}
                onClick={() => void syncAllToDesktop()}
                disabled={!logEntries.length || isSyncing}
              >
                Sync to Desktop
              </button>

              <div
                style={{
                  fontSize: 12,
                  marginBottom: v('--pg-shell-space-sm'),
                  color: v('--pg-shell-text-muted'),
                  lineHeight: 1.4,
                }}
              >
                Edit notes below, then Sync to Desktop to update{' '}
                <code style={{ fontSize: 11, fontFamily: v('--pg-shell-font-mono') }}>
                  logs/session-notes.json
                </code>
                . After you leave XR, this tab opens automatically if you logged anything from the
                headset.
              </div>

              {logEntries.length === 0 ? (
                <div
                  style={{
                    flex: 1,
                    border: `1px dashed ${v('--pg-shell-border-default')}`,
                    borderRadius: v('--pg-shell-radius-md'),
                    padding: v('--pg-shell-space-xl'),
                    textAlign: 'center',
                    color: v('--pg-shell-text-muted'),
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
                  <div
                    style={{
                      fontSize: 12,
                      color: v('--pg-shell-text-muted'),
                      marginBottom: v('--pg-shell-space-sm'),
                      flexShrink: 0,
                    }}
                  >
                    {logEntries.length} {logEntries.length === 1 ? 'entry' : 'entries'} (newest first)
                  </div>
                  <div
                    style={{
                      overflowY: 'auto',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: v('--pg-shell-space-sm'),
                      paddingRight: v('--pg-shell-space-xs'),
                    }}
                  >
                    {[...logEntries]
                      .reverse()
                      .map((entry) => (
                        <div
                          key={entry.id}
                          style={{
                            background: v('--pg-shell-bg-subtle'),
                            border: `1px solid ${v('--pg-shell-border-subtle')}`,
                            borderRadius: v('--pg-shell-radius-md'),
                            padding: v('--pg-shell-space-sm'),
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color: v('--pg-shell-text-muted'),
                              marginBottom: v('--pg-shell-space-xs'),
                              fontFamily: v('--pg-shell-font-mono'),
                            }}
                          >
                            {new Date(entry.timestamp).toLocaleString()} ·{' '}
                            {labs.find((l) => l.id === entry.labId)?.name ?? entry.labId} ·{' '}
                            {entry.mode ?? '—'} · {entry.inputSource}
                            {entry.fromHeadset ? (
                              <span style={{ color: v('--pg-shell-state-success'), marginLeft: 6 }}>
                                · headset
                              </span>
                            ) : null}
                          </div>
                          <textarea
                            aria-label={`Note for entry ${new Date(entry.timestamp).toLocaleString()}`}
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
              marginTop: v('--pg-shell-space-sm'),
              paddingTop: v('--pg-shell-space-sm'),
              borderTop: `1px solid ${v('--pg-shell-border-subtle')}`,
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: 12, color: v('--pg-shell-text-muted') }}>
              Desktop: {desktopStatus}
            </div>
            <div
              style={{
                marginTop: v('--pg-shell-space-micro'),
                fontSize: 11,
                color: v('--pg-shell-text-muted'),
                wordBreak: 'break-all',
                fontFamily: v('--pg-shell-font-mono'),
              }}
            >
              {desktopPath}
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  )
}
