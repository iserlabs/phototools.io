import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CatalogHealth } from './CatalogHealth'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('CatalogHealth', () => {
  it('renders missing/duplicate tiles and the action note', () => {
    const { wrapper } = renderWithAnalyzer(<CatalogHealth />, makeFixtureBlob())
    render(wrapper)
    // Counts appear in tiles, the by-folder table, and the sr-only caption.
    expect(screen.getAllByText(/14/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/22/).length).toBeGreaterThan(0)  // likelyDuplicates
    expect(screen.getByText(/\/Photos\/2022/)).toBeInTheDocument()
    expect(screen.getByText(/Find Missing Photos/i)).toBeInTheDocument()
  })
})
