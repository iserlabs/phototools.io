import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { RULER_MIN, RULER_MAX } from './rulerScale'
import { DofRuler } from './DofRuler'
import { DofRulerConnected } from './DofRulerConnected'
import esMessages from '@/lib/i18n/messages/es/tools/dof-simulator.json'

const esT = esMessages.toolUI['dof-simulator']

beforeAll(() => {
  // jsdom does not implement pointer capture — stub it so drag handlers
  // (which call setPointerCapture/hasPointerCapture/releasePointerCapture
  // on the event's currentTarget) don't throw.
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function () {}
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function () {
      return false
    }
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function () {}
  }
})

function baseProps(overrides: Partial<Parameters<typeof DofRuler>[0]> = {}) {
  return {
    distanceM: 3,
    nearFocus: 2,
    farFocus: 5,
    hyperfocal: 8,
    onDistanceChange: vi.fn(),
    ...overrides,
  }
}

describe('DofRuler', () => {
  it('renders the draggable subject as a labeled, focusable slider', () => {
    const { getByRole } = render(<DofRuler {...baseProps()} />)
    const slider = getByRole('slider', { name: 'Subject' })
    expect(slider).toHaveAttribute('tabindex', '0')
    expect(slider).toHaveAttribute('aria-valuenow', '3')
  })

  it('reports a plausible distance when the subject figure is dragged', () => {
    const onDistanceChange = vi.fn()
    const { container, getByRole } = render(<DofRuler {...baseProps({ onDistanceChange })} />)
    const svg = container.querySelector('svg')!
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
      width: 1000, height: 96, left: 0, top: 0, right: 1000, bottom: 96, x: 0, y: 0, toJSON: () => {},
    } as DOMRect)

    const slider = getByRole('slider')
    fireEvent.pointerDown(slider, { clientX: 500, pointerId: 1 })

    expect(onDistanceChange).toHaveBeenCalledTimes(1)
    const reported = onDistanceChange.mock.calls[0][0]
    expect(reported).toBeGreaterThanOrEqual(RULER_MIN)
    expect(reported).toBeLessThanOrEqual(RULER_MAX)
    // Dragging to the middle of the SVG should move off the initial 3m.
    expect(reported).not.toBeCloseTo(3, 1)
  })

  it('nudges the distance by ±0.1m on ArrowLeft/ArrowRight', () => {
    const onDistanceChange = vi.fn()
    const { getByRole } = render(<DofRuler {...baseProps({ distanceM: 3, onDistanceChange })} />)
    const slider = getByRole('slider')

    fireEvent.keyDown(slider, { key: 'ArrowRight' })
    expect(onDistanceChange.mock.calls[0][0]).toBeCloseTo(3.1, 5)

    fireEvent.keyDown(slider, { key: 'ArrowLeft' })
    expect(onDistanceChange.mock.calls[1][0]).toBeCloseTo(2.9, 5)
  })

  it('clamps keyboard nudges at the ruler bounds', () => {
    const onDistanceChange = vi.fn()
    const { getByRole, rerender } = render(<DofRuler {...baseProps({ distanceM: RULER_MAX, onDistanceChange })} />)
    fireEvent.keyDown(getByRole('slider'), { key: 'ArrowRight' })
    expect(onDistanceChange).toHaveBeenCalledWith(RULER_MAX)

    onDistanceChange.mockClear()
    rerender(<DofRuler {...baseProps({ distanceM: RULER_MIN, onDistanceChange })} />)
    fireEvent.keyDown(getByRole('slider'), { key: 'ArrowLeft' })
    expect(onDistanceChange).toHaveBeenCalledWith(RULER_MIN)
  })

  it('renders sensible geometry with no NaN attributes when farFocus is Infinity (past hyperfocal)', () => {
    const { container, getByText } = render(
      <DofRuler {...baseProps({ distanceM: 10, nearFocus: 5, farFocus: Infinity, hyperfocal: 10 })} />,
    )
    const svg = container.querySelector('svg')!
    svg.querySelectorAll('*').forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        expect(attr.value).not.toMatch(/NaN/)
      })
    })
    expect(getByText('∞')).toBeInTheDocument()
  })
})

function renderWithEs(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="es" messages={esMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('DofRulerConnected', () => {
  it('renders real ES translations, not the English-literal defaults', () => {
    const { getByRole, getByText } = renderWithEs(
      <DofRulerConnected {...baseProps()} />,
    )
    expect(getByRole('slider', { name: esT.depthRulerSubject })).toBeInTheDocument() // "Sujeto"
    expect(getByText(esT.hyperfocal)).toBeInTheDocument() // "Hiperfocal"
    expect(getByText(esT.depthRulerNear)).toBeInTheDocument() // "Cerca"
    expect(getByText(esT.depthRulerFar)).toBeInTheDocument() // "Lejos"
  })
})
