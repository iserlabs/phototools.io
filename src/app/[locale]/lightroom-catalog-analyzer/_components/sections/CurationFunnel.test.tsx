import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CurationFunnel } from './CurationFunnel'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('CurationFunnel', () => {
  it('renders all four funnel steps and a per-body row', () => {
    const { wrapper } = renderWithAnalyzer(<CurationFunnel />, makeFixtureBlob())
    render(wrapper)
    // Funnel-step labels also appear as per-gear table headers, so allow >1 match.
    expect(screen.getAllByText(/Total/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Not rejected/i)).toBeInTheDocument()
    expect(screen.getByText(/1\+ star/i)).toBeInTheDocument()
    expect(screen.getAllByText(/4\+ star/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Sony A7R V')).toBeInTheDocument()
  })
})
