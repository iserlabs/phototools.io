import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import commonMessages from '@/lib/i18n/messages/en/common.json'
import toolMessages from '@/lib/i18n/messages/en/tools/sensor-size-comparison.json'
import { SensorControlsPanel } from './SensorControlsPanel'
import type { DisplayMode } from './sensorSizeTypes'

const messages = {
  common: commonMessages.common,
  toolUI: toolMessages.toolUI,
}

function Wrapped({
  visible,
  onApplyPreset = () => {},
}: {
  visible: Set<string>
  onApplyPreset?: (sensorIds: string[]) => void
}) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <SensorControlsPanel
        visible={visible}
        mode={'overlay' as DisplayMode}
        customSensors={[]}
        onToggleSensor={() => {}}
        onModeChange={() => {}}
        onAddCustom={() => {}}
        onRemoveCustom={() => {}}
        onRemoveAllCustom={() => {}}
        onEditCustom={() => {}}
        onApplyPreset={onApplyPreset}
      />
    </NextIntlClientProvider>
  )
}

describe('SensorControlsPanel — grouped picker + quick-compare presets', () => {
  // Group headers carry `aria-expanded`; preset buttons (one of which is
  // labeled "Film vs Digital") carry `aria-pressed` instead and never
  // declare `aria-expanded`, so passing `expanded` narrows `getByRole` to
  // group headers only and keeps `/film/i` from also matching that preset.
  it('renders six group headers with counts; film starts collapsed', () => {
    render(<Wrapped visible={new Set(['ff', 'apsc_n'])} />)
    expect(screen.getByRole('button', { name: /film/i, expanded: false })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /full frame & aps/i, expanded: true })).toHaveAttribute('aria-expanded', 'true')
  })

  it('film group auto-expands when selection touches it', () => {
    render(<Wrapped visible={new Set(['film_6x7'])} />)
    expect(screen.getByRole('button', { name: /film/i, expanded: true })).toHaveAttribute('aria-expanded', 'true')
  })

  it('preset tap replaces selection', () => {
    const onApplyPreset = vi.fn()
    render(<Wrapped visible={new Set(['ff'])} onApplyPreset={onApplyPreset} />)
    fireEvent.click(screen.getByRole('button', { name: /crop vs full frame/i }))
    expect(onApplyPreset).toHaveBeenCalledWith(['ff', 'apsc_n', 'apsc_c', 'm43'])
  })
})
