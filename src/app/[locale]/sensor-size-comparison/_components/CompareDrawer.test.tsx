import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import commonMessages from '@/lib/i18n/messages/en/common.json'
import toolMessages from '@/lib/i18n/messages/en/tools/sensor-size-comparison.json'
import { ALL_SENSORS } from '@/lib/data/sensors'
import { CompareDrawer } from './CompareDrawer'
import type { ResolvedSensor, CustomSensor } from './sensorSizeTypes'

const messages = {
  common: commonMessages.common,
  toolUI: toolMessages.toolUI,
}

const byId = (id: string) => ALL_SENSORS.find((s) => s.id === id) as ResolvedSensor

const customSensorNoMp: CustomSensor = {
  id: 'custom_2', name: 'No MP Sensor', w: 30, h: 20, cropFactor: 1.44, color: '#ffffff',
}

function Wrapped({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}

describe('CompareDrawer', () => {
  it('renders both sensors with their computed specs', () => {
    render(<Wrapped><CompareDrawer a={byId('ff')} b={byId('apsc_n')} onClose={() => {}} /></Wrapped>)
    expect(screen.getByText('36×24 mm')).toBeInTheDocument()
    expect(screen.getByText('23.5×15.6 mm')).toBeInTheDocument()
    expect(screen.getByText('43.3 mm')).toBeInTheDocument() // FF diagonal
    expect(screen.getByText('28.2 mm')).toBeInTheDocument() // APS-C diagonal
  })

  it('renders the area ratio in both directions, not just a-relative-to-b', () => {
    render(<Wrapped><CompareDrawer a={byId('ff')} b={byId('apsc_n')} onClose={() => {}} /></Wrapped>)
    // FF area (864mm²) / APS-C area (366.6mm²) ≈ 2.36; the inverse ≈ 0.42.
    expect(screen.getByText(/Full Frame has 2\.36× the area of APS-C/)).toBeInTheDocument()
    expect(screen.getByText(/APS-C \(1\.5x\) has 0\.42× the area of Full Frame/)).toBeInTheDocument()
  })

  it('attributes light to the larger sensor and reach to the smaller regardless of order', () => {
    const { unmount } = render(<Wrapped><CompareDrawer a={byId('ff')} b={byId('apsc_n')} onClose={() => {}} /></Wrapped>)
    expect(screen.getByTestId('compare-verdict')).toHaveTextContent(/Full Frame/)
    expect(screen.getByTestId('compare-verdict')).toHaveTextContent(/2\.4×/)
    unmount()
    render(<Wrapped><CompareDrawer a={byId('apsc_n')} b={byId('ff')} onClose={() => {}} /></Wrapped>)
    // same attribution with the sides swapped
    expect(screen.getByTestId('compare-verdict')).toHaveTextContent(/Full Frame/)
    expect(screen.getByTestId('compare-verdict')).toHaveTextContent(/2\.4×/)
  })

  it('uses the near-equal verdict when the pair differs by under 0.15 EV', () => {
    render(<Wrapped><CompareDrawer a={byId('ff')} b={byId('cine_vv')} onClose={() => {}} /></Wrapped>)
    expect(screen.getByTestId('compare-verdict')).toHaveTextContent(/virtually identical/i)
  })

  it('shows no resolution figure for a film sensor and does not render NaN', () => {
    render(<Wrapped><CompareDrawer a={byId('film_6x7')} b={byId('ff')} onClose={() => {}} /></Wrapped>)
    expect(document.body.textContent).not.toMatch(/NaN|undefined/)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('shows no resolution figure for a custom sensor with no mp and does not render NaN', () => {
    render(<Wrapped><CompareDrawer a={customSensorNoMp} b={byId('ff')} onClose={() => {}} /></Wrapped>)
    expect(document.body.textContent).not.toMatch(/NaN|undefined/)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('calls onClose from the close control', () => {
    const onClose = vi.fn()
    render(<Wrapped><CompareDrawer a={byId('ff')} b={byId('m43')} onClose={onClose} /></Wrapped>)
    fireEvent.click(screen.getByRole('button', { name: /close comparison/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not move focus when focusToken is 0 (default) — e.g. opened from a shared ?vs= link on page load', () => {
    render(<Wrapped><CompareDrawer a={byId('ff')} b={byId('apsc_n')} onClose={() => {}} /></Wrapped>)
    expect(screen.getByRole('heading', { name: 'Compare' })).not.toHaveFocus()
  })

  it('moves focus to the drawer heading when focusToken is positive — a user-initiated open', () => {
    render(<Wrapped><CompareDrawer a={byId('ff')} b={byId('apsc_n')} onClose={() => {}} focusToken={1} /></Wrapped>)
    expect(screen.getByRole('heading', { name: 'Compare' })).toHaveFocus()
  })

  it('the drawer heading is programmatically focusable but excluded from tab order', () => {
    render(<Wrapped><CompareDrawer a={byId('ff')} b={byId('apsc_n')} onClose={() => {}} /></Wrapped>)
    expect(screen.getByRole('heading', { name: 'Compare' })).toHaveAttribute('tabIndex', '-1')
  })
})
