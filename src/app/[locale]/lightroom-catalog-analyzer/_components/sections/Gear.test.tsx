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
    expect(screen.getByText('70-200mm f/2.8 GM')).toBeInTheDocument()
    expect(screen.getByText(/Sony 28mm f\/2/)).toBeInTheDocument()
  })
})
