import { describe, expect, it } from 'vitest'
import { aggregateEditIntensity } from './edit-intensity'
import { adaptForAggregators, createTestCatalog } from './__test-helpers__'

const HEAVY_EDIT = `s = {
\tExposure2012 = "1.5",
\tContrast2012 = "30",
\tHighlights2012 = "-40",
\tShadows2012 = "20",
\tWhites2012 = "10",
\tBlacks2012 = "-15",
\tClarity2012 = "20",
\tVibrance = "10",
\tSaturation = "5",
\tTexture = "10",
\tDehaze = "5",
\tCropTop = "0.1",
\tCropBottom = "0.9",
\tCropLeft = "0",
\tCropRight = "1",
\tGradientBasedCorrections = { {} },
\tPresetType = "user",
}`

const LIGHT_EDIT = `s = {
\tExposure2012 = "0.1",
\tCropTop = "0",
\tCropBottom = "1",
\tCropLeft = "0",
\tCropRight = "1",
}`

const NO_EDIT = `s = { }`

describe('aggregateEditIntensity', () => {
  it('computes avg exposure shift, crop %, and local-adjustment %', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1', developSettings: HEAVY_EDIT },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: 'L1', developSettings: LIGHT_EDIT },
      { id: 3, captureTime: '2024-01-03T10:00:00', cameraModel: 'A', lens: 'L1', developSettings: NO_EDIT },
    ]))
    const r = aggregateEditIntensity(db)
    expect(r.sampled).toBe(false)
    expect(r.sampleSize).toBe(3)
    // avg exposure shift across HEAVY (1.5) + LIGHT (0.1) + NO_EDIT (0) = 1.6 / 3 ≈ 0.533
    expect(r.avgExposureShiftStops).toBeCloseTo(0.533, 2)
    // HEAVY crops 20% off the top; LIGHT and NO_EDIT crop 0%. Avg ≈ 6.67
    expect(r.avgCropPct).toBeCloseTo(6.67, 1)
    // Only HEAVY has local adjustments → 1/3 ≈ 33.3%
    expect(r.pctWithLocalAdjustments).toBeCloseTo(33.3, 1)
  })

  it('detects preset usage from PresetType marker', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1', developSettings: HEAVY_EDIT },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'A', lens: 'L1', developSettings: LIGHT_EDIT },
    ]))
    const r = aggregateEditIntensity(db)
    expect(r.pctWithPresets).toBe(50)
  })

  it('computes a monthly score timeseries with all 5 components contributing', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-15T10:00:00', cameraModel: 'A', lens: 'L1', developSettings: HEAVY_EDIT },
      { id: 2, captureTime: '2024-02-15T10:00:00', cameraModel: 'A', lens: 'L1', developSettings: NO_EDIT },
    ]))
    const r = aggregateEditIntensity(db)
    const jan = r.scoreByMonth.find((m) => m.month === '2024-01')
    const feb = r.scoreByMonth.find((m) => m.month === '2024-02')
    // HEAVY score: 20*min(1.5/2,1)=15 + 20*min(20/50,1)=8 + 20*1=20 + 20*1=20 + 20*min(11/10,1)=20 → 83
    expect(jan?.score).toBeGreaterThanOrEqual(80)
    expect(jan?.score).toBeLessThanOrEqual(90)
    expect(feb?.score).toBe(0)
  })

  it('returns empty block when no photos have develop settings', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1' },
    ]))
    const r = aggregateEditIntensity(db)
    expect(r.sampleSize).toBe(0)
    expect(r.sampled).toBe(false)
    expect(r.avgExposureShiftStops).toBe(0)
    expect(r.avgCropPct).toBe(0)
    expect(r.pctWithLocalAdjustments).toBe(0)
    expect(r.pctWithPresets).toBe(0)
    expect(r.topPresets).toEqual([])
    expect(r.scoreByMonth).toEqual([])
    expect(r.perGearScores).toEqual([])
  })

  it('respects the cameras filter on the per-gear score table', () => {
    const db = adaptForAggregators(createTestCatalog([
      { id: 1, captureTime: '2024-01-01T10:00:00', cameraModel: 'A', lens: 'L1', developSettings: HEAVY_EDIT },
      { id: 2, captureTime: '2024-01-02T10:00:00', cameraModel: 'B', lens: 'L2', developSettings: HEAVY_EDIT },
    ]))
    const r = aggregateEditIntensity(db, { cameras: ['A'] })
    expect(r.sampleSize).toBe(1)
    expect(r.perGearScores.length).toBe(1)
    expect(r.perGearScores[0].gear).toBe('A')
  })

  it('does not sample at exactly 50,000 develop-settings rows', () => {
    // The threshold is `> 50_000`, so exactly 50k should NOT trigger sampling.
    // We fake the population count via a mock DB to avoid creating 50k rows.
    const devRows = [
      { text: LIGHT_EDIT, captureTime: '2024-01-01T10:00:00', body: 'A', lens: 'L1' },
    ]
    const mockDb = {
      selectObject: (sql: string) => {
        if (sql.includes('Adobe_imageDevelopSettings')) return { n: 50_000 }
        return undefined
      },
      selectObjects: () => devRows,
    }
    const r = aggregateEditIntensity(mockDb)
    expect(r.sampled).toBe(false)
  })

  it('enables sampling above 50,000 develop-settings rows', () => {
    const devRows = [
      { text: LIGHT_EDIT, captureTime: '2024-01-01T10:00:00', body: 'A', lens: 'L1' },
    ]
    const mockDb = {
      selectObject: (sql: string) => {
        if (sql.includes('Adobe_imageDevelopSettings')) return { n: 50_001 }
        return undefined
      },
      selectObjects: () => devRows,
    }
    const r = aggregateEditIntensity(mockDb)
    expect(r.sampled).toBe(true)
  })
})
