import { Canvas } from '@react-three/fiber'
import { Stats } from '@react-three/drei'
import { XRRoot } from '../xr/core/XRRoot'
import { PlaygroundControls } from '../ui/PlaygroundControls'
import { DebugPanel } from '../ui/DebugPanel'

export function App() {
  return (
    <>
      <Canvas style={{ position: 'fixed', inset: 0 }}>
        <XRRoot />
        <Stats />
      </Canvas>
      <PlaygroundControls />
      <DebugPanel />
    </>
  )
}
