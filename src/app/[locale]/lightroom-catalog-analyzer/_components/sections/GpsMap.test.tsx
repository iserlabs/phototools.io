import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GpsMap } from './GpsMap'
import { makeFixtureBlob, renderWithAnalyzer } from './__test-helpers__'

describe('GpsMap', () => {
  it('renders a canvas with the GPS aria label and top-regions list', () => {
    const { wrapper } = renderWithAnalyzer(<GpsMap />, makeFixtureBlob())
    render(wrapper)
    expect(screen.getByRole('img', { name: /gps map/i })).toBeInTheDocument()
    expect(screen.getByText('United States')).toBeInTheDocument()
    expect(screen.getByText('France')).toBeInTheDocument()
    expect(screen.getByText(/31%/)).toBeInTheDocument()
  })
})
