import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PeriodComparison } from './PeriodComparison'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'
import type { AnalyzerWorker } from '../analyzer/AnalyzerContext'

describe('PeriodComparison', () => {
  it('renders two empty date-range forms by default', () => {
    const { wrapper } = renderWithAnalyzer(<PeriodComparison />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByRole('heading', { name: /period comparison/i })).toBeInTheDocument()
    expect(screen.getAllByLabelText(/start/i)).toHaveLength(2)
    expect(screen.getAllByLabelText(/end/i)).toHaveLength(2)
  })

  it('disables Apply buttons until a worker is provided', () => {
    const { wrapper } = renderWithAnalyzer(<PeriodComparison />, makeFixtureBlob(), { worker: null })
    render(wrapper)
    const applies = screen.getAllByRole('button', { name: /apply/i }) as HTMLButtonElement[]
    expect(applies.every((b) => b.disabled)).toBe(true)
  })

  it('enables Apply when a worker is present', () => {
    const fakeWorker = {
      applyFilter: vi.fn(),
      computeYearInReview: vi.fn(),
      openCatalog: vi.fn(),
      close: vi.fn(),
    } as unknown as AnalyzerWorker
    const { wrapper } = renderWithAnalyzer(<PeriodComparison />, makeFixtureBlob(), { worker: fakeWorker })
    render(wrapper)
    const applies = screen.getAllByRole('button', { name: /apply/i }) as HTMLButtonElement[]
    expect(applies.some((b) => !b.disabled)).toBe(true)
  })
})
