import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { ParseProgress } from './ParseProgress'

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('ParseProgress', () => {
  it('renders the localized stage label for a known stage', () => {
    renderWithIntl(<ParseProgress stage="hashing" pct={42} />)
    expect(screen.getByText('Computing hash…')).toBeInTheDocument()
    expect(screen.getByText(/42%/)).toBeInTheDocument()
  })

  it('falls back to the raw stage key when unknown', () => {
    renderWithIntl(<ParseProgress stage="custom-stage" pct={10} />)
    expect(screen.getByText('custom-stage')).toBeInTheDocument()
  })

  it('clamps pct into [0, 100] for the bar width', () => {
    const { container } = renderWithIntl(<ParseProgress stage="reading" pct={150} />)
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar).toBeTruthy()
    expect(bar.style.width).toBe('100%')
  })

  it('renders an aria-valuenow attribute for screen readers', () => {
    const { container } = renderWithIntl(<ParseProgress stage="reading" pct={37} />)
    const bar = container.querySelector('[role="progressbar"]') as HTMLElement
    expect(bar.getAttribute('aria-valuenow')).toBe('37')
  })
})
