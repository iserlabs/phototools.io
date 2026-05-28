import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Gear } from './Gear'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('Gear', () => {
  it('renders top lenses, top combos, and a retired callout', () => {
    const { wrapper } = renderWithAnalyzer(<Gear />, makeFixtureBlob())
    render(wrapper)
    // "24-70mm f/2.8 GM" appears in both the top-lenses list and the combos table.
    expect(screen.getAllByText('24-70mm f/2.8 GM').length).toBeGreaterThan(0)
    expect(screen.getByText(/70-200mm f\/2\.8 GM/)).toBeInTheDocument()
    expect(screen.getByText(/Sony 28mm f\/2/)).toBeInTheDocument()
  })

  it('omits the retired callout when no gear has been retired', () => {
    const blob = makeFixtureBlob()
    blob.gear.retired = []
    const { wrapper } = renderWithAnalyzer(<Gear />, blob)
    render(wrapper)
    expect(screen.queryByText(/Sony 28mm f\/2/)).not.toBeInTheDocument()
  })

  it('renders without crashing when all gear data is empty', () => {
    const blob = makeFixtureBlob()
    blob.gear.topLenses = []
    blob.gear.topCombos = []
    blob.gear.bodiesOverTime = []
    blob.gear.retired = []
    const { wrapper } = renderWithAnalyzer(<Gear />, blob)
    render(wrapper)
    // Section heading still present
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })
})
