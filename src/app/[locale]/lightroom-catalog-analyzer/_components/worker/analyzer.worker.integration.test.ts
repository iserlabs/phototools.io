/**
 * Integration test for analyzer.worker.ts.
 *
 * Rather than spawning a real Web Worker (sqlite-wasm + Vitest jsdom is
 * flaky), we exercise the worker module's `api` object directly. This still
 * validates the full pipeline: openCatalog → all 16 aggregators →
 * InsightBlob assembly → Zod validation, and gives us regression coverage
 * for the wiring in analyzer.worker.ts.
 *
 * The only thing this test does NOT cover is the Comlink/postMessage
 * boundary itself, which is exercised by the Playwright E2E in Plan 1g.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type * as ComlinkTypes from 'comlink'
import type { AnalyzerWorker } from './analyzer.worker'
import { insightBlobSchema } from '@/lib/lrcat/insight-blob.schema'
import { buildFixtureBuffer } from '@/lib/lrcat/test-fixtures/build-fixture-catalog'

// `analyzer.worker.ts` calls Comlink.expose() at module evaluation. In a
// non-worker (Node/jsdom) context, that throws because there's no
// `postMessage` global. We stub Comlink.expose to a no-op so the module
// loads cleanly. Comlink's `proxy` and friends are not used by the worker
// internals — only by callers — so this mock is safe.
vi.mock('comlink', async () => {
  const actual = await vi.importActual<typeof ComlinkTypes>('comlink')
  return { ...actual, expose: vi.fn() }
})

// The worker calls Comlink.expose(api) once at module-eval time. We capture
// the api here in beforeAll — vitest's `clearMocks` wipes the spy's call
// history between tests, so reading `mock.calls` lazily in the second test
// would find nothing.
let api: AnalyzerWorker

beforeAll(async () => {
  // Dynamic import so the comlink mock is in place before module eval.
  await import('./analyzer.worker')
  const Comlink = await import('comlink')
  const exposeMock = vi.mocked(Comlink.expose)
  expect(exposeMock).toHaveBeenCalled()
  api = exposeMock.mock.calls[0][0] as AnalyzerWorker
})

describe('analyzer.worker integration', () => {
  it('opens a fixture catalog and emits a schema-valid InsightBlob', async () => {
    const buffer = buildFixtureBuffer()

    const progressEvents: Array<{ stage: string; pct: number }> = []
    const blob = await api.openCatalog(buffer, (e) => progressEvents.push(e))

    // Validate via Zod — single source of truth for "well-formed".
    const result = insightBlobSchema.safeParse(blob)
    if (!result.success) {
      // Surface a useful error in test output.
      throw new Error('Zod validation failed: ' + JSON.stringify(result.error.issues, null, 2))
    }

    // Sanity-check a few headline values come through the wiring.
    expect(blob.meta.schemaVersion).toBe(1)
    expect(blob.meta.catalogVersion).toBe(14)
    expect(blob.meta.totalPhotos).toBe(60)
    expect(blob.overview.totalPhotos).toBe(60)
    expect(blob.yearInReview).not.toBe(null)
    expect(blob.yearToYear?.years.length ?? 0).toBeGreaterThan(0)

    // Progress events were fired in order.
    const stages = progressEvents.map((e) => e.stage)
    expect(stages).toContain('overview')
    expect(stages).toContain('year-in-review')
    expect(stages.indexOf('overview')).toBeLessThan(stages.indexOf('year-in-review'))

    // applyFilter re-runs against the resident DB.
    const filtered = await api.applyFilter({ cameras: ['Sony A7R V'] })
    expect(filtered.overview.totalPhotos).toBe(60)
    expect(filtered.filterContext).toBeDefined()

    // computeYearInReview targets a specific year directly.
    const single = await api.computeYearInReview(2024)
    expect(single.year).toBe(2024)

    await api.close()
  })

  it('rejects an ArrayBuffer that is not a SQLite database', async () => {
    const junk = new ArrayBuffer(64)
    new Uint8Array(junk).fill(0xff)
    await expect(api.openCatalog(junk)).rejects.toThrow()
  })

  it('opens a catalog from a File (openCatalogFile, OPFS-less fallback path)', async () => {
    // In Node/jsdom there's no OPFS, so openCatalogFile falls back to reading
    // the File into a buffer + deserialize — exercising the File entry point
    // and producing the same well-formed blob as the ArrayBuffer path.
    const buffer = buildFixtureBuffer()
    const file = new File([new Uint8Array(buffer)], 'Lightroom Catalog.lrcat', {
      type: 'application/x-sqlite3',
    })

    const blob = await api.openCatalogFile(file)
    const result = insightBlobSchema.safeParse(blob)
    if (!result.success) {
      throw new Error('Zod validation failed: ' + JSON.stringify(result.error.issues, null, 2))
    }
    expect(blob.meta.catalogVersion).toBe(14)
    expect(blob.overview.totalPhotos).toBe(60)
    await api.close()
  })

  it('rejects a File that is not a SQLite database', async () => {
    const junk = new File([new Uint8Array(64).fill(0xff)], 'fake.lrcat')
    await expect(api.openCatalogFile(junk)).rejects.toThrow()
  })
})
