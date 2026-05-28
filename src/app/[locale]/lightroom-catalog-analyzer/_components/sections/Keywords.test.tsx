import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Keywords } from './Keywords'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('Keywords', () => {
  it('renders tagged/untagged counts and top keywords', () => {
    const { wrapper } = renderWithAnalyzer(<Keywords />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByText(/2,200/)).toBeInTheDocument()    // tagged
    expect(screen.getByText(/184/)).toBeInTheDocument()      // unique
    expect(screen.getByText(/street/i)).toBeInTheDocument()
    expect(screen.getByText(/portrait/i)).toBeInTheDocument()
  })

  it('shows blindSpotsEmpty message when there are no blind spots', () => {
    const blob = makeFixtureBlob()
    blob.keywords.blindSpots = []
    const { wrapper } = renderWithAnalyzer(<Keywords />, blob)
    render(wrapper)
    expect(screen.getByText(/Coverage looks even across months/i)).toBeInTheDocument()
  })
})
