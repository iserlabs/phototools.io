import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { BokehPanel } from './BokehPanel'
import { BokehPanelConnected } from './BokehPanelConnected'
import { BOKEH_SHAPE_IDS } from '@/lib/data/dofSimulator/bokeh'
import esMessages from '@/lib/i18n/messages/es/tools/dof-simulator.json'

describe('BokehPanel', () => {
  it('lists every BOKEH_SHAPE_IDS value as a select option', () => {
    const { getByRole } = render(<BokehPanel bokeh="disc" onChange={vi.fn()} />)
    const select = getByRole('combobox') as HTMLSelectElement
    const values = [...select.options].map((o) => o.value)
    expect(values).toEqual(BOKEH_SHAPE_IDS)
  })

  it('reflects the current shape as the selected value', () => {
    const { getByRole } = render(<BokehPanel bokeh="blade7" onChange={vi.fn()} />)
    const select = getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('blade7')
  })

  it('calls onChange with the newly selected shape id, not the previous one', () => {
    const onChange = vi.fn()
    const { getByRole } = render(<BokehPanel bokeh="disc" onChange={onChange} />)
    const select = getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'cata' } })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith('cata')
    expect(onChange).not.toHaveBeenCalledWith('disc')
  })

  it('is keyboard accessible: a native select with an accessible name', () => {
    const { getByRole } = render(<BokehPanel bokeh="disc" onChange={vi.fn()} />)
    // Accessible name comes from aria-label; getByRole with `name` fails if absent.
    expect(getByRole('combobox', { name: 'Bokeh' })).toBeInTheDocument()
  })
})

// ── BokehPanelConnected: prove translations actually flow through ──
// Rendered inside a NextIntlClientProvider with the ES locale (not EN) so a
// passing assertion means real translation occurred — see controls.test.tsx /
// results.test.tsx for the same precedent.

const esT = esMessages.toolUI['dof-simulator']

function renderWithEs(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('BokehPanelConnected', () => {
  it('renders real ES translations for the panel title and every shape option', () => {
    const { getAllByText, getByRole } = renderWithEs(
      <BokehPanelConnected bokeh="disc" onChange={vi.fn()} />,
    )
    // "Bokeh" appears as both the panel title and the select's accessible name.
    expect(getAllByText(esT.bokeh).length).toBeGreaterThanOrEqual(1)

    const select = getByRole('combobox') as HTMLSelectElement
    const optionLabels = [...select.options].map((o) => o.textContent)
    expect(optionLabels).toEqual([
      esT.bokehShapeDisc,
      esT.bokehShapeBlade5,
      esT.bokehShapeBlade6,
      esT.bokehShapeBlade7,
      esT.bokehShapeBlade8,
      esT.bokehShapeBlade9,
      esT.bokehShapeCata,
    ])
    // Real Spanish, not the English literal fallback.
    expect(esT.bokehShapeBlade7).not.toBe('7 Blades')
  })

  it('changing the select calls onChange with the shape id under the ES-translated option', () => {
    const onChange = vi.fn()
    const { getByRole } = renderWithEs(<BokehPanelConnected bokeh="disc" onChange={onChange} />)
    const select = getByRole('combobox') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'blade9' } })
    expect(onChange).toHaveBeenCalledWith('blade9')
  })
})
