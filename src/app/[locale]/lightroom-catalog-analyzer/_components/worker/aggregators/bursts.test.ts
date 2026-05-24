import { describe, expect, it } from 'vitest'
import { aggregateBursts } from './bursts'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

describe('aggregateBursts', () => {
  it('groups photos <1s apart from the same camera into bursts of ≥3', () => {
    const db = adaptForAggregators(createTestCatalog([
      // Burst 1 — 4 shots, same serial, all within 0.5s of each other
      { id: 1, captureTime: '2024-01-01T10:00:00.000', cameraModel: 'A', lens: 'L1', cameraSerial: 'S1' },
      { id: 2, captureTime: '2024-01-01T10:00:00.250', cameraModel: 'A', lens: 'L1', cameraSerial: 'S1' },
      { id: 3, captureTime: '2024-01-01T10:00:00.500', cameraModel: 'A', lens: 'L1', cameraSerial: 'S1' },
      { id: 4, captureTime: '2024-01-01T10:00:00.750', cameraModel: 'A', lens: 'L1', cameraSerial: 'S1' },
      // Singleton — same camera, gap >1s
      { id: 5, captureTime: '2024-01-01T10:00:05.000', cameraModel: 'A', lens: 'L1', cameraSerial: 'S1' },
      // Burst 2 — 3 shots
      { id: 6, captureTime: '2024-01-01T10:00:10.000', cameraModel: 'A', lens: 'L1', cameraSerial: 'S1' },
      { id: 7, captureTime: '2024-01-01T10:00:10.500', cameraModel: 'A', lens: 'L1', cameraSerial: 'S1' },
      { id: 8, captureTime: '2024-01-01T10:00:10.900', cameraModel: 'A', lens: 'L1', cameraSerial: 'S1' },
    ]))
    const r = aggregateBursts(db)
    expect(r.totalBursts).toBe(2)
    expect(r.totalPhotosInBursts).toBe(7)   // 4 + 3
    expect(r.longestBurst).toBe(4)
    expect(r.lengthHistogram).toEqual(
      expect.arrayContaining([
        { length: 3, count: 1 },
        { length: 4, count: 1 },
      ]),
    )
  })

  it('breaks a burst when the camera changes mid-sequence', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00.000', cameraModel: 'A', cameraSerial: 'S1' },
      { id: 2, captureTime: '2024-01-01T10:00:00.250', cameraModel: 'A', cameraSerial: 'S1' },
      { id: 3, captureTime: '2024-01-01T10:00:00.500', cameraModel: 'B', cameraSerial: 'S2' },
      { id: 4, captureTime: '2024-01-01T10:00:00.750', cameraModel: 'B', cameraSerial: 'S2' },
    ]))
    const r = aggregateBursts(db)
    // Neither sub-group reaches ≥3 → no bursts
    expect(r.totalBursts).toBe(0)
  })

  it('falls back to camera model when serial is missing', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00.000', cameraModel: 'A' },
      { id: 2, captureTime: '2024-01-01T10:00:00.250', cameraModel: 'A' },
      { id: 3, captureTime: '2024-01-01T10:00:00.500', cameraModel: 'A' },
    ]))
    const r = aggregateBursts(db)
    expect(r.totalBursts).toBe(1)
    expect(r.totalPhotosInBursts).toBe(3)
  })

  it('computes keeper rates: ≥4 stars in burst vs single-shot', () => {
    const db = adaptForAggregators(createTestCatalog([
      // Burst with 1/4 keeper
      { id: 1, captureTime: '2024-01-01T10:00:00.000', cameraModel: 'A', cameraSerial: 'S1', rating: 0 },
      { id: 2, captureTime: '2024-01-01T10:00:00.250', cameraModel: 'A', cameraSerial: 'S1', rating: 0 },
      { id: 3, captureTime: '2024-01-01T10:00:00.500', cameraModel: 'A', cameraSerial: 'S1', rating: 0 },
      { id: 4, captureTime: '2024-01-01T10:00:00.750', cameraModel: 'A', cameraSerial: 'S1', rating: 5 },
      // Singletons: 2/2 keepers
      { id: 5, captureTime: '2024-01-01T11:00:00.000', cameraModel: 'A', cameraSerial: 'S1', rating: 5 },
      { id: 6, captureTime: '2024-01-01T12:00:00.000', cameraModel: 'A', cameraSerial: 'S1', rating: 4 },
    ]))
    const r = aggregateBursts(db)
    expect(r.keeperRatePct).toBe(25)              // 1/4
    expect(r.singleShotKeeperRatePct).toBe(100)   // 2/2
  })

  it('does NOT count exactly 2 photos <1s apart as a burst (minimum is 3)', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00.000', cameraModel: 'A', cameraSerial: 'S1' },
      { id: 2, captureTime: '2024-01-01T10:00:00.500', cameraModel: 'A', cameraSerial: 'S1' },
    ]))
    const r = aggregateBursts(db)
    expect(r.totalBursts).toBe(0)
    expect(r.totalPhotosInBursts).toBe(0)
    expect(r.pctInBursts).toBe(0)
    expect(r.longestBurst).toBe(0)
  })

  it('returns zeros on an empty catalog', () => {
    const db = adaptForAggregators(createTestCatalog([]))
    const r = aggregateBursts(db)
    expect(r.totalBursts).toBe(0)
    expect(r.totalPhotosInBursts).toBe(0)
    expect(r.pctInBursts).toBe(0)
    expect(r.longestBurst).toBe(0)
    expect(r.lengthHistogram).toEqual([])
    expect(r.keeperRatePct).toBe(0)
    expect(r.singleShotKeeperRatePct).toBe(0)
  })
})
