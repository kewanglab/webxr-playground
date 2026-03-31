import { Leva } from 'leva'

export function DebugPanel() {
  return (
    <Leva
      collapsed={false}
      theme={{
        sizes: {
          rootWidth: '460px',
          controlWidth: '200px',
          rowHeight: '40px',
        },
        fontSizes: {
          root: '15px',
        },
      }}
    />
  )
}
