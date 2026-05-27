import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { YearInReview } from './YearInReview'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('YearInReview', () => {
  it('renders headline stats from the year block', () => {
    const blob = makeFixtureBlob()
    const { wrapper } = renderWithAnalyzer(<YearInReview />, blob)
    render(wrapper)
    expect(screen.getByText('1,240')).toBeInTheDocument()           // totalPhotos
    expect(screen.getByText('87')).toBeInTheDocument()              // daysShot
    expect(screen.getAllByText('Sony A7R V').length).toBeGreaterThan(0)
    expect(screen.getAllByText('24-70mm f/2.8 GM').length).toBeGreaterThan(0)
  })

  it('renders the year picker with the current year selected', () => {
    const blob = makeFixtureBlob()
    const { wrapper } = renderWithAnalyzer(<YearInReview />, blob)
    render(wrapper)
    // Scope to the combobox role: `/year/i` also matches the section heading
    // ("Year in Review") via aria-labelledby, so getByLabelText is ambiguous.
    const select = screen.getByRole('combobox', { name: /year/i }) as HTMLSelectElement
    expect(select.value).toBe('2024')
  })

  it('falls back to a placeholder when no year-in-review data is present', () => {
    const blob = makeFixtureBlob({ yearInReview: null })
    const { wrapper } = renderWithAnalyzer(<YearInReview />, blob)
    render(wrapper)
    expect(screen.getByText(/no year-in-review data/i)).toBeInTheDocument()
  })
})
