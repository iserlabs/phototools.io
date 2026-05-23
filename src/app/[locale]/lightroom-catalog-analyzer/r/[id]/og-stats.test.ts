import { describe, expect, it } from 'vitest'
import { buildOgStats } from './og-stats'
import type { InsightBlob } from '@/lib/lrcat/types'

function blob(overrides: Partial<InsightBlob> = {}): InsightBlob {
  return {
    meta: { schemaVersion: 1, catalogVersion: 14, totalPhotos: 3120, dateRange: { first: '2022-01-01', last: '2024-12-31' }, parsedAt: 0, catalogHash: 'a'.repeat(64) },
    overview: { totalPhotos: 3120, dateRange: { first: '2022-01-01', last: '2024-12-31' }, daysShot: 223, photosPerDay: 14, bodyCount: 2, lensCount: 5, topBody: 'Sony A7R V', topLens: '24-70mm f/2.8 GM', topFocalLengthMm: 35 },
    ...overrides,
  } as unknown as InsightBlob
}

describe('buildOgStats', () => {
  it('builds the header and five stat cells', () => {
    const s = buildOgStats(blob())
    expect(s.filtered).toBe(false)
    expect(s.cells).toHaveLength(5)
    expect(s.cells[0].value).toBe('3,120')          // total photos
    expect(s.cells.find((c) => c.value === 'Sony A7R V')).toBeTruthy()
    expect(s.cells.find((c) => c.value === '35mm')).toBeTruthy()
  })

  it('flags a filtered view', () => {
    const s = buildOgStats(blob({ filterContext: { cameras: ['Sony A7R V'] } }))
    expect(s.filtered).toBe(true)
  })

  it('renders em-dash for missing top gear', () => {
    const s = buildOgStats(blob({ overview: { totalPhotos: 0, dateRange: { first: '', last: '' }, daysShot: 0, photosPerDay: 0, bodyCount: 0, lensCount: 0, topBody: null, topLens: null, topFocalLengthMm: null } } as unknown as Partial<InsightBlob>))
    expect(s.cells.find((c) => c.label.toLowerCase().includes('body'))?.value).toBe('—')
  })
})
