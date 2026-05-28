import { describe, expect, it } from 'vitest'
import { parseDevelopSettings } from './develop-settings-parser'

const sampleBlob = `s = {
\tExposure2012 = "0.45",
\tCropTop = "0",
\tCropLeft = "0",
\tCropBottom = "1",
\tCropRight = "1",
\tCropAngle = "0",
\tHasSettings = true,
\tGradientBasedCorrections = {
\t\t{ LocalExposure2012 = "0.3" },
\t},
}`

const noCropBlob = `s = {
\tExposure2012 = "-1.2",
\tHasSettings = true,
}`

const emptyBlob = `s = { }`

describe('parseDevelopSettings', () => {
  it('extracts exposure shift in stops', () => {
    expect(parseDevelopSettings(sampleBlob).exposureShiftStops).toBe(0.45)
  })

  it('extracts negative exposure', () => {
    expect(parseDevelopSettings(noCropBlob).exposureShiftStops).toBe(-1.2)
  })

  it('computes crop percent', () => {
    // sample: full frame (Top 0, Bottom 1, Left 0, Right 1) → 0% cropped
    expect(parseDevelopSettings(sampleBlob).cropPct).toBe(0)
  })

  it('detects local adjustments (gradient/radial/brush)', () => {
    expect(parseDevelopSettings(sampleBlob).hasLocalAdjustments).toBe(true)
    expect(parseDevelopSettings(noCropBlob).hasLocalAdjustments).toBe(false)
  })

  it('handles empty / minimal blobs', () => {
    const r = parseDevelopSettings(emptyBlob)
    expect(r.exposureShiftStops).toBe(0)
    expect(r.cropPct).toBe(0)
    expect(r.hasLocalAdjustments).toBe(false)
  })

  it('reports non-zero crop', () => {
    const cropped = `s = {
\tCropTop = "0.1",
\tCropLeft = "0.05",
\tCropBottom = "0.95",
\tCropRight = "0.95",
}`
    const r = parseDevelopSettings(cropped)
    // remaining area = 0.85 * 0.9 = 0.765 → 23.5% cropped
    expect(r.cropPct).toBeCloseTo(23.5, 1)
  })

  it('counts touched develop sliders via known keys', () => {
    const heavy = `s = {
\tExposure2012 = "0.5",
\tContrast2012 = "20",
\tHighlights2012 = "-30",
\tShadows2012 = "10",
\tWhites2012 = "5",
\tBlacks2012 = "-15",
\tClarity2012 = "10",
\tVibrance = "15",
}`
    expect(parseDevelopSettings(heavy).slidersTouched).toBeGreaterThanOrEqual(7)
  })

  it('returns 0 sliders for an untouched blob', () => {
    expect(parseDevelopSettings(emptyBlob).slidersTouched).toBe(0)
  })

  it('clamps extreme exposure values to ±10', () => {
    const extreme = `s = {\n\tExposure2012 = "999",\n}`
    expect(parseDevelopSettings(extreme).exposureShiftStops).toBe(10)
    const negative = `s = {\n\tExposure2012 = "-500",\n}`
    expect(parseDevelopSettings(negative).exposureShiftStops).toBe(-10)
  })
})
