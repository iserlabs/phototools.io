/**
 * Golden-stats regression test for the committed demo catalog (Audit m-9).
 *
 * Loads `public/demo-catalogs/phototools-demo.lrcat` from disk, runs it through
 * the real worker pipeline (openCatalog → 16 aggregators → InsightBlob → Zod),
 * and asserts the CONCRETE headline numbers the deterministic generator
 * (scripts/build-demo-catalog.ts, fixed PRNG seed 0x70686f74) produces.
 *
 * If an aggregator regresses or the generator drifts, these exact values
 * change and CI fails — which is the point. When the demo is intentionally
 * regenerated, update the constants below to the new stable values.
 *
 * This complements the Playwright demo spec (asset-served + SQLite header)
 * by exercising the values end-to-end without needing the Plan 1f UI.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { insightBlobSchema } from '@/lib/lrcat/insight-blob.schema'

vi.mock('comlink', async () => {
  const actual = await vi.importActual<typeof import('comlink')>('comlink')
  return { ...actual, expose: vi.fn() }
})

const DEMO_PATH = resolve(process.cwd(), 'public/demo-catalogs/phototools-demo.lrcat')

function loadDemoBuffer(): ArrayBuffer {
  const buf = readFileSync(DEMO_PATH)
  const ab = new ArrayBuffer(buf.byteLength)
  new Uint8Array(ab).set(buf)
  return ab
}

// Skip gracefully if the artifact hasn't been generated in this checkout.
const hasDemo = existsSync(DEMO_PATH)

describe.skipIf(!hasDemo)('demo catalog golden stats', () => {
  it('produces the known headline numbers for the synthetic 3-year catalog', async () => {
    await import('./analyzer.worker')
    const Comlink = await import('comlink')
    const exposeMock = vi.mocked(Comlink.expose)
    type Api = import('./analyzer.worker').AnalyzerWorker
    const api = exposeMock.mock.calls[0][0] as Api

    const blob = await api.openCatalog(loadDemoBuffer())

    // Well-formed under the share schema.
    const parsed = insightBlobSchema.safeParse(blob)
    expect(parsed.success).toBe(true)

    // Concrete golden values — stable because of the fixed PRNG seed.
    expect(blob.meta.catalogVersion).toBe(14)
    expect(blob.meta.totalPhotos).toBe(3000)
    expect(blob.overview.totalPhotos).toBe(3000)
    expect(blob.overview.bodyCount).toBe(2)        // Sony ILCE-7RM5 + FUJIFILM X100V
    expect(blob.overview.lensCount).toBe(5)        // 4 Sony + Fuji fixed 23mm
    expect(blob.yearToYear?.years).toEqual([2025, 2024, 2023])
    expect(blob.heatmap.years.slice().sort()).toEqual([2023, 2024, 2025])
    expect(blob.yearInReview?.year).toBe(2025)     // most-recent year default

    await api.close()
  })
})
