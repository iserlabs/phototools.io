import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Apertures } from './Apertures'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('Apertures', () => {
  it('renders one chart per lens with wide-open callout', () => {
    const { wrapper } = renderWithAnalyzer(<Apertures />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByText('24-70mm f/2.8 GM')).toBeInTheDocument()
    expect(screen.getByText(/71%/)).toBeInTheDocument()
  })

  it('shows an empty state when no lens passes the 100-photo threshold', () => {
    const blob = makeFixtureBlob()
    blob.apertures.perLens = []
    const { wrapper } = renderWithAnalyzer(<Apertures />, blob)
    render(wrapper)
    expect(screen.getByText(/not enough data/i)).toBeInTheDocument()
  })
})
