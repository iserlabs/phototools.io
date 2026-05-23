/**
 * Demo-catalog golden assertions.
 *
 * Plan 1d ships the demo .lrcat and the worker pipeline that can parse it.
 * The UI shell that lets a user click "Try the demo" and see the dashboard
 * is built in Plans 1e and 1f, so at the browser level this spec confirms the
 * demo asset is served and looks like SQLite.
 *
 * The CONCRETE headline-stat assertions (Audit m-9: totalPhotos === 3000,
 * bodyCount === 2, lensCount === 5, years === [2025, 2024, 2023]) live in the
 * Vitest golden test
 *   src/app/[locale]/lightroom-catalog-analyzer/_components/worker/demo-catalog.golden.test.ts
 * which drives the real worker pipeline against this same committed artifact —
 * no UI required, so it runs in `npm test` / CI today. When Plan 1f wires the
 * "Try the demo" flow, a DOM-level assertion can be added here to confirm those
 * numbers also render on screen.
 */
import { test, expect } from '@playwright/test'

test.describe('Lightroom Catalog Analyzer — demo', () => {
  test('demo catalog asset is served and looks like SQLite', async ({ request }) => {
    const res = await request.get('/demo-catalogs/phototools-demo.lrcat')
    expect(res.status()).toBe(200)
    const body = await res.body()
    // First 16 bytes of a SQLite file = "SQLite format 3\0".
    const header = body.subarray(0, 16).toString('latin1')
    expect(header).toBe('SQLite format 3\0')
    // Sanity: file is not absurdly small.
    expect(body.byteLength).toBeGreaterThan(1024 * 100) // > 100 KB
  })
})
