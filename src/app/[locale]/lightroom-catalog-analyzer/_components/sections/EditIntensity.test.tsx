import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditIntensity } from './EditIntensity'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('EditIntensity', () => {
  it('renders headline edit stats, line chart, and per-gear scores', () => {
    const { wrapper } = renderWithAnalyzer(<EditIntensity />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByText(/0\.42/)).toBeInTheDocument()      // avg exposure
    expect(screen.getByText(/36%/)).toBeInTheDocument()        // pct local adj
    expect(screen.getByText(/VSCO Kodak Gold/)).toBeInTheDocument()
    expect(screen.getByText('Sony A7R V')).toBeInTheDocument()
  })

  it('shows a sampled badge when sampling kicked in', () => {
    const blob = makeFixtureBlob()
    blob.editIntensity.sampled = true
    blob.editIntensity.sampleSize = 12000
    const { wrapper } = renderWithAnalyzer(<EditIntensity />, blob)
    render(wrapper)
    expect(screen.getByText(/estimate based on/i)).toBeInTheDocument()
  })
})
