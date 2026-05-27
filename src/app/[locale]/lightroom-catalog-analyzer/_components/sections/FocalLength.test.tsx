import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FocalLength } from './FocalLength'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('FocalLength', () => {
  it('renders the canvas, top peaks, and one-prime callout', () => {
    const { wrapper } = renderWithAnalyzer(<FocalLength />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getAllByRole('img', { name: /focal length histogram/i }).length).toBeGreaterThan(0)
    // "35mm" appears in both the top-peaks list and the one-prime callout.
    expect(screen.getAllByText(/35mm/).length).toBeGreaterThan(0)
    expect(screen.getByText(/47%/)).toBeInTheDocument()
  })

  it('hides the one-prime callout when coverage is null', () => {
    const blob = makeFixtureBlob()
    blob.focalLength.bestOnePrime = null
    const { wrapper } = renderWithAnalyzer(<FocalLength />, blob)
    render(wrapper)
    expect(screen.getByText(/too spread out/i)).toBeInTheDocument()
  })
})
