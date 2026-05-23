import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Drilldown } from './Drilldown'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('Drilldown', () => {
  it('renders the stub placeholder', () => {
    const { wrapper } = renderWithAnalyzer(<Drilldown />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByText(/wired in Plan 1g/i)).toBeInTheDocument()
  })

  it('renders the section heading from the message file', () => {
    const { wrapper } = renderWithAnalyzer(<Drilldown />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByRole('heading', { name: /drilldown/i })).toBeInTheDocument()
  })
})
