import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { FilterContextBanner } from './FilterContextBanner'
import type { AnalysisFilter } from '@/lib/lrcat/types'

function wrap(ui: React.ReactNode) {
  return <NextIntlClientProvider locale="en" messages={enMessages}>{ui}</NextIntlClientProvider>
}

describe('FilterContextBanner', () => {
  it('renders inline when 3 or fewer dimensions are active', () => {
    const f: AnalysisFilter = { cameras: ['Sony A7R V'] }
    render(wrap(<FilterContextBanner filter={f} />))
    expect(screen.getByText(/filter applied/i)).toBeInTheDocument()
    expect(screen.getByText(/Sony A7R V/)).toBeInTheDocument()
    // No <details> disclosure for short filters
    expect(screen.queryByText(/show all filters/i)).toBeNull()
  })

  it('uses a collapsible <details> when more than 3 dimensions are active', () => {
    const f: AnalysisFilter = {
      cameras: ['A'], lenses: ['L'], ratings: [4, 5],
      dateRange: { start: '2024-01-01', end: '2024-12-31' },
      apertureRange: [1.4, 2.8],
    }
    const { container } = render(wrap(<FilterContextBanner filter={f} />))
    expect(container.querySelector('details')).not.toBeNull()
    expect(screen.getByText(/show all filters/i)).toBeInTheDocument()
  })

  it('renders nothing for an undefined filter', () => {
    const { container } = render(wrap(<FilterContextBanner filter={undefined} />))
    expect(container).toBeEmptyDOMElement()
  })
})
