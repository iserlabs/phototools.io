import { describe, expect, it } from 'vitest'
import { aggregateGps } from './gps'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateGps', () => {
  it('returns zeros on an empty catalog', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    const r = aggregateGps(db)
    expect(r.totalPhotosWithGps).toBe(0)
    expect(r.pctWithGps).toBe(0)
    expect(r.clusters).toEqual([])
    expect(r.topRegions).toEqual([])
  })

  it('counts photos with GPS vs total', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L', gpsLat: 40.7128, gpsLng: -74.006 },
      { id: 2, captureTime: '2024-01-01T11:00:00', cameraModel: 'A', lens: 'L', gpsLat: 40.7128, gpsLng: -74.006 },
      { id: 3, captureTime: '2024-01-01T12:00:00', cameraModel: 'A', lens: 'L' },
    ]))
    const r = aggregateGps(db)
    expect(r.totalPhotosWithGps).toBe(2)
    expect(r.pctWithGps).toBeCloseTo(66.67, 1)
  })

  it('drops clusters with fewer than 5 photos (PII guard)', () => {
    // 4 photos at one location — should be dropped.
    const db = adaptForAggregators(createTestCatalog(
      Array.from({ length: 4 }, (_, i) => ({
        id: i + 1, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'L', gpsLat: 40.7128, gpsLng: -74.006,
      })),
    ))
    const r = aggregateGps(db)
    expect(r.clusters).toEqual([])
    // No surviving clusters → no regions either.
    expect(r.topRegions).toEqual([])
  })

  it('emits clusters with ≥5 photos snapped to ~5 km grid', () => {
    // 5 photos within a tiny lat/lng spread — same grid cell at 3-decimal precision.
    const db = adaptForAggregators(createTestCatalog(
      Array.from({ length: 5 }, (_, i) => ({
        id: i + 1, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'L',
        gpsLat: 40.7128 + i * 0.0001,
        gpsLng: -74.006 + i * 0.0001,
      })),
    ))
    const r = aggregateGps(db)
    expect(r.clusters).toHaveLength(1)
    expect(r.clusters[0].count).toBe(5)
    // ~5 km grid (0.05°) snaps the near-identical coords to one cell center.
    expect(r.clusters[0].lat).toBeCloseTo(40.7, 2)
    expect(r.clusters[0].lng).toBeCloseTo(-74.0, 2)
  })

  it('caps at top 200 clusters by count', () => {
    // Build 210 well-separated 5+-photo clusters; expect only 200 in the output.
    const photos: Array<Parameters<typeof createTestCatalog>[0][number]> = []
    let id = 1
    for (let c = 0; c < 210; c++) {
      const lat = c * 0.5 // 0.5° apart — guaranteed distinct grid cells
      const lng = 0
      for (let p = 0; p < 5; p++) {
        photos.push({
          id: id++, captureTime: '2024-01-01T10:00:00',
          cameraModel: 'A', lens: 'L', gpsLat: lat, gpsLng: lng,
        })
      }
    }
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateGps(db)
    expect(r.clusters).toHaveLength(200)
  })

  it('respects AnalysisFilter (camera filter narrows the set)', () => {
    const photos = [
      ...Array.from({ length: 5 }, (_, i) => ({
        id: i + 1, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'L', gpsLat: 40.7128, gpsLng: -74.006,
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: i + 100, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'B', lens: 'L', gpsLat: 35.0, gpsLng: 139.0,
      })),
    ]
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateGps(db, { cameras: ['A'] })
    expect(r.clusters).toHaveLength(1)
    expect(r.clusters[0].lat).toBeCloseTo(40.7, 2)
  })

  // AUDIT M-3: topRegions must NOT ship permanently empty. The offline
  // nearest-centroid lookup populates it from the PII-guarded clusters.
  it('populates topRegions from clustered GPS fixtures', () => {
    const db = adaptForAggregators(createTestCatalog(
      Array.from({ length: 5 }, (_, i) => ({
        id: i + 1, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'L', gpsLat: 40.7128, gpsLng: -74.006,
      })),
    ))
    const r = aggregateGps(db)
    expect(r.topRegions.length).toBeGreaterThan(0)
    expect(r.topRegions[0]).toEqual({ region: 'United States (East)', count: 5 })
  })

  it('orders topRegions by descending count across multiple clusters', () => {
    const photos = [
      // NYC: 8 photos (US East)
      ...Array.from({ length: 8 }, (_, i) => ({
        id: i + 1, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'L', gpsLat: 40.7128, gpsLng: -74.006,
      })),
      // Tokyo: 5 photos (Japan)
      ...Array.from({ length: 5 }, (_, i) => ({
        id: i + 100, captureTime: '2024-01-01T10:00:00',
        cameraModel: 'A', lens: 'L', gpsLat: 35.68, gpsLng: 139.69,
      })),
    ]
    const db = adaptForAggregators(createTestCatalog(photos))
    const r = aggregateGps(db)
    expect(r.topRegions).toEqual([
      { region: 'United States (East)', count: 8 },
      { region: 'Japan', count: 5 },
    ])
  })
})
