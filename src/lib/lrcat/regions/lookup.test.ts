import { describe, expect, it } from 'vitest'
import { lookupRegion, topRegionsFromClusters } from './lookup'

describe('lookupRegion', () => {
  it('maps New York City coordinates to the US East region', () => {
    expect(lookupRegion(40.7128, -74.006)).toBe('United States (East)')
  })

  it('maps Tokyo coordinates to Japan', () => {
    expect(lookupRegion(35.68, 139.69)).toBe('Japan')
  })

  it('maps central London coordinates to the United Kingdom', () => {
    expect(lookupRegion(51.5, -0.12)).toBe('United Kingdom')
  })

  it('maps Sydney coordinates to Australia (East)', () => {
    expect(lookupRegion(-33.87, 151.21)).toBe('Australia (East)')
  })

  it('returns null for non-finite coordinates', () => {
    expect(lookupRegion(Number.NaN, 10)).toBe(null)
    expect(lookupRegion(10, Number.POSITIVE_INFINITY)).toBe(null)
  })

  it('returns null for out-of-range coordinates', () => {
    expect(lookupRegion(120, 0)).toBe(null)
    expect(lookupRegion(0, 200)).toBe(null)
  })
})

describe('topRegionsFromClusters', () => {
  it('returns an empty array for no clusters', () => {
    expect(topRegionsFromClusters([])).toEqual([])
  })

  it('aggregates cluster counts by region and sorts descending', () => {
    const r = topRegionsFromClusters([
      { lat: 40.7128, lng: -74.006, count: 10 }, // US East
      { lat: 40.0, lng: -75.0, count: 5 }, // US East
      { lat: 35.68, lng: 139.69, count: 8 }, // Japan
    ])
    expect(r).toEqual([
      { region: 'United States (East)', count: 15 },
      { region: 'Japan', count: 8 },
    ])
  })

  it('skips clusters with invalid coordinates', () => {
    const r = topRegionsFromClusters([
      { lat: Number.NaN, lng: 0, count: 100 },
      { lat: 35.68, lng: 139.69, count: 3 },
    ])
    expect(r).toEqual([{ region: 'Japan', count: 3 }])
  })
})
