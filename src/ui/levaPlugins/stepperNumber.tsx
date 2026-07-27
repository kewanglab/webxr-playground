import { createPlugin, useInputContext, Components, clamp, styled, useTh } from 'leva/plugin'

const { Row, Label } = Components

/** Public API for labs — unchanged: `stepperNumber({ value, min, max, step })`. */
type StepperInput = {
  value?: number
  min?: number
  max?: number
  step?: number
}

/**
 * What we actually hand to Leva. The `value` key is deliberately renamed to
 * `init`: Leva's `parseOptions` collapses a custom plugin's input down to just
 * `input.value` whenever a `value` key is present, which would strip
 * `min`/`max`/`step` before `normalize` ever sees them (leva 0.10.1,
 * `vector-plugin-*.esm.js` — `if (customType && isObject(input) && 'value' in input)`).
 * Without a `value` key Leva passes the whole object through untouched.
 */
type StepperPluginInput = {
  init?: number
  min?: number
  max?: number
  step?: number
}

type StepperSettings = {
  min: number
  max: number
  step: number
  /** Stable fallback when Leva briefly passes a non-finite value (avoids storing 0 for size, etc.). */
  seed: number
}

const StepperBar = styled('div', {
  display: 'flex',
  flexDirection: 'column',
  gap: '$space$md',
  width: '100%',
  minWidth: 0,
})

const StepperRow = styled('div', {
  display: 'flex',
  alignItems: 'center',
  gap: '$space$md',
  width: '100%',
  minWidth: 0,
})

const StepBtn = styled('button', {
  flex: '0 0 auto',
  minWidth: '$sizes$rowHeight',
  width: '$sizes$rowHeight',
  height: '$sizes$rowHeight',
  borderRadius: '$radii$sm',
  border: '1px solid $elevation2',
  background: '$elevation1',
  color: '$folderTextColor',
  fontSize: '20px',
  lineHeight: 1,
  cursor: 'pointer',
  fontWeight: 600,
  '&:hover': {
    background: '$elevation2',
  },
  '&:active': {
    transform: 'scale(0.96)',
  },
})

const Range = styled('input', {
  width: '100%',
  minHeight: '$sizes$rowHeight',
  paddingBlock: '$space$sm',
  boxSizing: 'border-box',
  cursor: 'pointer',
})

/** Plain number field — do not use Leva's `Components.Number` here; it expects full internal `settings` as props. */
const NumberField = styled('input', {
  flex: '1 1 auto',
  minWidth: '$sizes$numberInputMinWidth',
  height: '$sizes$rowHeight',
  boxSizing: 'border-box',
  borderRadius: '$radii$sm',
  border: '1px solid $elevation2',
  background: '$elevation2',
  color: '$folderTextColor',
  fontSize: '$fontSizes$root',
  fontFamily: '$mono',
  padding: '0 $space$md',
  textAlign: 'center' as const,
})

function StepperComponent() {
  const { label, value, onUpdate, settings } = useInputContext<{
    value: number
    settings: StepperSettings
  }>()
  const accentColor = useTh('colors', 'accent2')

  const seed =
    typeof settings.seed === 'number' && Number.isFinite(settings.seed)
      ? settings.seed
      : settings.min + (settings.max - settings.min) * 0.5
  const base = typeof value === 'number' && Number.isFinite(value) ? value : seed

  const step = (dir: -1 | 1) => {
    const next = clamp(base + dir * settings.step, settings.min, settings.max)
    onUpdate(next)
  }

  return (
    <Row input>
      <Label>{label}</Label>
      <StepperBar>
        <StepperRow>
          <StepBtn type="button" onClick={() => step(-1)} aria-label="Decrease">
            −
          </StepBtn>
          <NumberField
            type="number"
            step={settings.step}
            min={settings.min}
            max={settings.max}
            value={base}
            onChange={(e) => {
              const v = parseFloat(e.target.value)
              if (!Number.isNaN(v)) onUpdate(v)
            }}
          />
          <StepBtn type="button" onClick={() => step(1)} aria-label="Increase">
            +
          </StepBtn>
        </StepperRow>
        <Range
          type="range"
          min={settings.min}
          max={settings.max}
          step={settings.step}
          value={clamp(base, settings.min, settings.max)}
          onChange={(e) => onUpdate(Number(e.target.value))}
          style={{
            accentColor: typeof accentColor === 'string' ? accentColor : '#60a5fa',
          }}
        />
      </StepperBar>
    </Row>
  )
}

const stepperNumberPlugin = createPlugin<StepperPluginInput, number, StepperSettings>({
  component: StepperComponent,
  normalize: (input) => {
    // Guard the shape: if Leva ever collapses this to a bare number again, fall
    // back to treating it as the initial value rather than silently seeding the
    // midpoint of a 0–100 range (which is what produced a deadzone of 50).
    const raw: StepperPluginInput =
      typeof input === 'number' ? { init: input } : (input ?? {})
    const min = raw.min ?? 0
    const max = raw.max ?? 100
    const step = raw.step ?? 1
    const mid = min + (max - min) * 0.5
    const resolved = raw.init !== undefined && raw.init !== null ? raw.init : mid
    return {
      value: resolved,
      settings: { min, max, step, seed: resolved },
    }
  },
  sanitize: (v, settings) => {
    const n = Number(v)
    if (Number.isNaN(n)) throw new Error('Invalid number')
    return clamp(n, settings.min, settings.max)
  },
})

/**
 * Lab-facing wrapper. Keeps the `{ value, min, max, step }` call signature the
 * labs already use while handing Leva a `value`-free object (see
 * `StepperPluginInput`), so the range settings survive into `normalize`.
 */
export function stepperNumber(input: StepperInput = {}) {
  return stepperNumberPlugin({
    init: input.value,
    min: input.min,
    max: input.max,
    step: input.step,
  })
}
