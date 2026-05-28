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

  it('renders an empty-state message instead of the map when there is no GPS data', () => {
    const blob = makeFixtureBlob()
    blob.gps.pctWithGps = 0
    blob.gps.totalPhotosWithGps = 0
    blob.gps.clusters = []
    blob.gps.topRegions = []
    const { wrapper } = renderWithAnalyzer(<GpsMap />, blob)
    render(wrapper)
    expect(screen.queryByRole('img', { name: /gps map/i })).not.toBeInTheDocument()
    expect(screen.getByText(/no gps data/i)).toBeInTheDocument()
  })
})
