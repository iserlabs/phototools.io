import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { DrilldownForm } from './DrilldownForm'
import type { AnalysisFilter } from '@/lib/lrcat/types'

// Mock the useAnalyzer hook (canonical flattened contract: applyFilter + reset).
const applyFilterMock = vi.fn()
const resetMock = vi.fn()
let mockFilter: AnalysisFilter | undefined

vi.mock('../analyzer/useAnalyzer', () => ({
  useAnalyzer: () => ({
    filter: mockFilter,
    applyFilter: applyFilterMock,
    reset: resetMock,
    insightBlob: {
      gear: {
        topLenses: [{ lens: '24-70mm f/2.8', count: 100 }, { lens: '85mm f/1.4', count: 50 }],
        bodiesOverTime: [
          { month: '2024-01', body: 'Sony A7R V', count: 100 },
          { month: '2024-01', body: 'Fuji X100V', count: 30 },
        ],
        topCombos: [],
        retired: [],
      },
    },
  }),
}))

// Minimal i18n provider — keys nested under sections.drilldown to match component.
const messages = {
  toolUI: {
    'lightroom-catalog-analyzer': {
      sections: {
        drilldown: {
          title: 'Drilldown Explorer',
          description: 'Filter the dashboard.',
          dateRange: 'Date range',
          dateStart: 'From',
          dateEnd: 'To',
          cameras: 'Cameras',
          lenses: 'Lenses',
          focalLength: 'Focal length',
          focalLengthMin: 'Min mm',
          focalLengthMax: 'Max mm',
          aperture: 'Aperture',
          apertureMin: 'Min f',
          apertureMax: 'Max f',
          iso: 'ISO',
          isoMin: 'Min ISO',
          isoMax: 'Max ISO',
          ratings: 'Ratings',
          rating0: '0', rating1: '1', rating2: '2', rating3: '3', rating4: '4', rating5: '5',
          pickState: 'Pick state',
          pickAny: 'Any',
          pickFlagged: 'Flagged',
          pickRejected: 'Rejected',
          pickNone: 'Unflagged',
          apply: 'Apply',
          reset: 'Reset',
        },
      },
    },
  },
}

function renderForm() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DrilldownForm />
    </NextIntlClientProvider>,
  )
}

describe('DrilldownForm', () => {
  beforeEach(() => {
    applyFilterMock.mockClear()
    resetMock.mockClear()
    mockFilter = undefined
  })

  it('renders all form fields', () => {
    renderForm()
    expect(screen.getByText('Drilldown Explorer')).toBeInTheDocument()
    expect(screen.getByLabelText('From')).toBeInTheDocument()
    expect(screen.getByLabelText('To')).toBeInTheDocument()
    expect(screen.getByText('Cameras')).toBeInTheDocument()
    expect(screen.getByText('Lenses')).toBeInTheDocument()
    expect(screen.getByLabelText('Min mm')).toBeInTheDocument()
    expect(screen.getByLabelText('Max mm')).toBeInTheDocument()
    expect(screen.getByLabelText('Min f')).toBeInTheDocument()
    expect(screen.getByLabelText('Max f')).toBeInTheDocument()
    expect(screen.getByText('Apply')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('lists cameras from insightBlob.gear', () => {
    renderForm()
    expect(screen.getByLabelText('Sony A7R V')).toBeInTheDocument()
    expect(screen.getByLabelText('Fuji X100V')).toBeInTheDocument()
  })

  it('lists lenses from insightBlob.gear.topLenses', () => {
    renderForm()
    expect(screen.getByLabelText('24-70mm f/2.8')).toBeInTheDocument()
    expect(screen.getByLabelText('85mm f/1.4')).toBeInTheDocument()
  })

  it('does NOT call applyFilter on field changes (no debounce, Apply-only)', () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText('Min mm'), { target: { value: '24' } })
    expect(applyFilterMock).not.toHaveBeenCalled()
  })

  it('calls applyFilter with the assembled filter on Apply (date end widened to end-of-day)', () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2024-01-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2024-12-31' } })
    fireEvent.change(screen.getByLabelText('Min mm'), { target: { value: '24' } })
    fireEvent.change(screen.getByLabelText('Max mm'), { target: { value: '70' } })
    fireEvent.click(screen.getByLabelText('Sony A7R V'))
    fireEvent.click(screen.getByText('Apply'))
    expect(applyFilterMock).toHaveBeenCalledTimes(1)
    const arg = applyFilterMock.mock.calls[0][0] as AnalysisFilter
    expect(arg.dateRange).toEqual({ start: '2024-01-01T00:00:00', end: '2024-12-31T23:59:59' })
    expect(arg.focalLengthRange).toEqual([24, 70])
    expect(arg.cameras).toEqual(['Sony A7R V'])
  })

  it('Reset calls reset and clears local form state', () => {
    renderForm()
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2024-01-01' } })
    fireEvent.click(screen.getByText('Reset'))
    expect(resetMock).toHaveBeenCalledTimes(1)
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('')
  })

  it('omits empty fields from the assembled filter', () => {
    renderForm()
    fireEvent.click(screen.getByLabelText('Sony A7R V'))
    fireEvent.click(screen.getByText('Apply'))
    const arg = applyFilterMock.mock.calls[0][0] as AnalysisFilter
    expect(arg.dateRange).toBeUndefined()
    expect(arg.focalLengthRange).toBeUndefined()
    expect(arg.cameras).toEqual(['Sony A7R V'])
  })

  it('rehydrates form state from the current global filter on mount (strips time suffix)', () => {
    mockFilter = {
      dateRange: { start: '2024-06-01T00:00:00', end: '2024-06-30T23:59:59' },
      focalLengthRange: [35, 35],
      cameras: ['Fuji X100V'],
    }
    renderForm()
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('2024-06-01')
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('2024-06-30')
    expect((screen.getByLabelText('Min mm') as HTMLInputElement).value).toBe('35')
    expect((screen.getByLabelText('Fuji X100V') as HTMLInputElement).checked).toBe(true)
  })
})
