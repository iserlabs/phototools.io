import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { ActiveFilterPills } from './ActiveFilterPills'
import type { AnalysisFilter } from '@/lib/lrcat/types'

const applyFilterMock = vi.fn()
let mockFilter: AnalysisFilter | undefined

vi.mock('../analyzer/useAnalyzer', () => ({
  useAnalyzer: () => ({
    filter: mockFilter,
    applyFilter: applyFilterMock,
    reset: vi.fn(),
    insightBlob: null,
  }),
}))

const messages = {
  toolUI: {
    'lightroom-catalog-analyzer': {
      sections: {
        drilldown: {
          activeFilters: 'Active filters',
          removeFilter: 'Remove {label} filter',
          filterDateRange: 'Date {start} – {end}',
          filterCameras: 'Camera: {names}',
          filterLenses: 'Lens: {names}',
          filterFocalLength: 'Focal length {min}–{max}mm',
          filterAperture: 'Aperture f/{min}–f/{max}',
          filterIso: 'ISO {min}–{max}',
          filterRatings: 'Rating: {ratings}',
          filterPicks: 'Pick: {state}',
        },
      },
    },
  },
}

function renderPills() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ActiveFilterPills />
    </NextIntlClientProvider>,
  )
}

describe('ActiveFilterPills', () => {
  beforeEach(() => {
    applyFilterMock.mockClear()
    mockFilter = undefined
  })

  it('renders nothing when no filter is active', () => {
    const { container } = renderPills()
    expect(container.querySelector('ul')).toBeNull()
  })

  it('renders one pill per active dimension (date shown without time suffix)', () => {
    mockFilter = {
      dateRange: { start: '2024-01-01T00:00:00', end: '2024-12-31T23:59:59' },
      cameras: ['Sony A7R V'],
      focalLengthRange: [24, 70],
    }
    renderPills()
    expect(screen.getByText(/Date 2024-01-01 – 2024-12-31/)).toBeInTheDocument()
    expect(screen.getByText(/Camera: Sony A7R V/)).toBeInTheDocument()
    expect(screen.getByText(/Focal length 24–70mm/)).toBeInTheDocument()
  })

  it('removing a pill calls applyFilter with that dimension stripped', () => {
    mockFilter = {
      dateRange: { start: '2024-01-01T00:00:00', end: '2024-12-31T23:59:59' },
      cameras: ['Sony A7R V'],
    }
    renderPills()
    fireEvent.click(screen.getByLabelText(/Remove .*Date.* filter/))
    expect(applyFilterMock).toHaveBeenCalledTimes(1)
    const arg = applyFilterMock.mock.calls[0][0] as AnalysisFilter
    expect(arg.dateRange).toBeUndefined()
    expect(arg.cameras).toEqual(['Sony A7R V'])
  })

  it('joins multi-value lists with comma', () => {
    mockFilter = { cameras: ['Sony A7R V', 'Fuji X100V'] }
    renderPills()
    expect(screen.getByText(/Sony A7R V, Fuji X100V/)).toBeInTheDocument()
  })
})
