import type { CSSProperties } from 'react'
import { xrStore } from '../xr/core/xrStore'
import { usePlaygroundStore } from '../app/store'
import { labs } from '../config/labs'

const button: CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #555',
  borderRadius: 6,
  background: '#1a1a1a',
  color: '#ddd',
  cursor: 'pointer',
  fontSize: 14,
  fontFamily: 'system-ui, sans-serif',
}

const activeButton: CSSProperties = {
  ...button,
  background: '#333',
  borderColor: '#999',
  color: '#fff',
  fontWeight: 600,
}

const xrButton: CSSProperties = {
  ...button,
  background: '#0a1628',
  borderColor: '#3b82f6',
  color: '#60a5fa',
}

export function PlaygroundControls() {
  const currentLab = usePlaygroundStore((s) => s.currentLab)
  const setLab = usePlaygroundStore((s) => s.setLab)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: 20,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        zIndex: 10,
      }}
    >
      <button style={xrButton} onClick={() => xrStore.enterVR()}>
        Enter VR
      </button>
      <button style={xrButton} onClick={() => xrStore.enterAR()}>
        Enter AR
      </button>
      <div
        style={{
          width: 1,
          height: 24,
          background: '#555',
          margin: '0 4px',
        }}
      />
      {labs.map((lab) => (
        <button
          key={lab.id}
          style={currentLab === lab.id ? activeButton : button}
          onClick={() => setLab(lab.id)}
          title={lab.description}
        >
          {lab.name}
        </button>
      ))}
    </div>
  )
}
