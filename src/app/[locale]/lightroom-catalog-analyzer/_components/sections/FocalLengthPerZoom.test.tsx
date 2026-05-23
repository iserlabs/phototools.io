import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FocalLengthPerZoom } from './FocalLengthPerZoom'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('FocalLengthPerZoom', () => {
  it('renders one chart per zoom lens with per-lens callout', () => {
    const { wrapper } = renderWithAnalyzer(<FocalLengthPerZoom />, makeFixtureBlob())
    render(wrapper)
    // Lens name appears in the per-lens heading and the callout.
    expect(screen.getAllByText(/24-70mm f\/2\.8 GM/).length).toBeGreaterThan(0)
    expect(screen.getByText(/62%/)).toBeInTheDocument()
  })

  it('falls back to an empty-state message when no zooms detected', () => {
    const blob = makeFixtureBlob()
    blob.focalLengthPerZoom.zooms = []
    const { wrapper } = renderWithAnalyzer(<FocalLengthPerZoom />, blob)
    render(wrapper)
    expect(screen.getByText(/no zoom lenses detected/i)).toBeInTheDocument()
  })
})
