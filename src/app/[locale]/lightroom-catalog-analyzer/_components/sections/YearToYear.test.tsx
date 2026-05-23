import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { YearToYear } from './YearToYear'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('YearToYear', () => {
  it('renders one column per year and one row per stat', () => {
    const { wrapper } = renderWithAnalyzer(<YearToYear />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByRole('columnheader', { name: '2022' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '2023' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '2024' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Total photos' })).toBeInTheDocument()
  })

  it('renders the biggest-shift callout', () => {
    const { wrapper } = renderWithAnalyzer(<YearToYear />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByText(/biggest shift/i)).toBeInTheDocument()
    expect(screen.getByText(/\+320 photos/)).toBeInTheDocument()
  })

  it('respects the year-count selector (trim to 2)', () => {
    const { wrapper } = renderWithAnalyzer(<YearToYear />, makeFixtureBlob())
    render(wrapper)
    const select = screen.getByLabelText(/show last/i) as HTMLSelectElement
    fireEvent.change(select, { target: { value: '2' } })
    expect(screen.queryByRole('columnheader', { name: '2022' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '2023' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '2024' })).toBeInTheDocument()
  })
})
