import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Ratings } from './Ratings'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('Ratings', () => {
  it('renders distribution, color labels, and per-gear pick rates', () => {
    const { wrapper } = renderWithAnalyzer(<Ratings />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByText('Red')).toBeInTheDocument()
    expect(screen.getByText('Green')).toBeInTheDocument()
    expect(screen.getByText('Sony A7R V')).toBeInTheDocument()
    expect(screen.getByText('24-70mm f/2.8 GM')).toBeInTheDocument()
  })
})
