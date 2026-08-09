import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import commonMessages from '@/lib/i18n/messages/en/common.json'
import toolMessages from '@/lib/i18n/messages/en/tools/sensor-size-comparison.json'
import { ALL_SENSORS } from '@/lib/data/sensors'
import { SensorTable } from './SensorTable'
import type { ResolvedSensor, CustomSensor } from './sensorSizeTypes'

const messages = {
  common: commonMessages.common,
  toolUI: toolMessages.toolUI,
}

const ff = ALL_SENSORS.find((s) => s.id === 'ff') as ResolvedSensor
const apscN = ALL_SENSORS.find((s) => s.id === 'apsc_n') as ResolvedSensor
const film6x7 = ALL_SENSORS.find((s) => s.id === 'film_6x7') as ResolvedSensor
const customSensor: CustomSensor = {
  id: 'custom_1', name: 'My Sensor', w: 30, h: 20, cropFactor: 1.44, color: '#ffffff', mp: 24,
}
const customSensorNoMp: CustomSensor = {
  id: 'custom_2', name: 'No MP Sensor', w: 30, h: 20, cropFactor: 1.44, color: '#ffffff',
}

function Wrapped({ sensors, onHover }: { sensors: ResolvedSensor[]; onHover?: (id: string | null) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <SensorTable
        sensors={sensors}
        expandedId={expandedId}
        onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
        hoveredId={hoveredId}
        onHover={(id) => { setHoveredId(id); onHover?.(id) }}
        variant="desktop"
      />
    </NextIntlClientProvider>
  )
}

describe('SensorTable — expandable deep-dive rows', () => {
  it('expands one row at a time with computed depth', () => {
    render(<Wrapped sensors={[ff, apscN]} />)
    fireEvent.click(screen.getByRole('button', { name: /aps-c \(1.5x\)/i }))
    expect(screen.getByText(/28.2 mm/)).toBeInTheDocument() // diagonal
    expect(screen.getByText(/0.42× · −1.2 EV/)).toBeInTheDocument() // vs FF
    fireEvent.click(screen.getByRole('button', { name: /full frame/i }))
    expect(screen.queryByText(/0.42× · −1.2 EV/)).not.toBeInTheDocument() // accordion — only one open
    expect(screen.getByText(/reference sensor/i)).toBeInTheDocument()
  })

  it('film rows show no resolution pills; custom rows show no profile', () => {
    render(<Wrapped sensors={[film6x7, customSensor]} />)
    fireEvent.click(screen.getByRole('button', { name: /6×7 film/i }))
    expect(screen.queryByText(/µm/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /6×7 film/i })) // collapse
    fireEvent.click(screen.getByRole('button', { name: /my sensor/i }))
    expect(screen.getByText(/custom sensor.+computed data only/i)).toBeInTheDocument()
    expect(screen.queryByText(/^character$/i)).not.toBeInTheDocument()
  })

  it('custom row with no mp omits the resolutions block and renders no NaN/undefined', () => {
    render(<Wrapped sensors={[customSensorNoMp]} />)
    fireEvent.click(screen.getByRole('button', { name: /no mp sensor/i }))
    expect(screen.queryByText(/µm/)).not.toBeInTheDocument()
    expect(screen.queryByText(/common resolutions/i)).not.toBeInTheDocument()
    expect(screen.getByText(/custom sensor.+computed data only/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/NaN/)
    expect(document.body.textContent).not.toMatch(/undefined/)
  })

  it('wires aria-expanded/aria-controls with variant-scoped ids, toggles on click', () => {
    render(<Wrapped sensors={[ff]} />)
    const btn = screen.getByRole('button', { name: /full frame/i })
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(btn).toHaveAttribute('aria-controls', 'sensor-detail-desktop-ff')
    expect(document.getElementById('sensor-detail-desktop-ff')).not.toBeInTheDocument()

    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('sensor-detail-desktop-ff')).toBeInTheDocument()

    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('sensor-detail-desktop-ff')).not.toBeInTheDocument()
  })

  it('does not spam console.error for a preset whose profile prose is not authored yet', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<Wrapped sensors={[ff]} />)
    fireEvent.click(screen.getByRole('button', { name: /full frame/i }))
    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('hovering a row calls onHover with its id and applies rowHovered, leaving calls onHover(null)', () => {
    const onHover = vi.fn()
    render(<Wrapped sensors={[ff]} onHover={onHover} />)
    const row = document.getElementById('sensor-row-desktop-ff') as HTMLElement
    expect(row.className).not.toContain('rowHovered')

    fireEvent.mouseEnter(row)
    expect(onHover).toHaveBeenCalledWith('ff')
    expect(row.className).toContain('rowHovered')

    fireEvent.mouseLeave(row)
    expect(onHover).toHaveBeenCalledWith(null)
    expect(row.className).not.toContain('rowHovered')
  })
})
