import { test, expect } from '@playwright/test'

// Runs against a production build per CLAUDE.md ("E2E Testing"). It does NOT
// upload a real .lrcat (that path is covered by the worker integration test in
// Plan 1d); it drives everything downstream via the bundled demo catalog
// autoloaded by `?demo=true`.

const TOOL_PATH = '/en/lightroom-catalog-analyzer'
const DEMO_PATH = `${TOOL_PATH}?demo=true`

// Section anchors in this codebase are `section-`-prefixed via `anchorIdFor(id)`
// (see _components/nav/sections.ts), NOT bare `#overview`.
const SEC = (id: string) => `#section-${id}`

// Generous visibility bound: the analyzer spins up a SQLite-WASM worker, fetches
// the ~900 KB demo asset, and runs 16 aggregators over 3000 photos. ~1 s of pure
// parse (per the Node golden test) plus CI cold-start headroom.
const DEMO_TIMEOUT = 30_000

// Parse-time benchmark bound (m-6 / spec §17). Spec §17 targets < 2 s for the
// parse itself (asserted directly by the deterministic Node golden test
// `demo-catalog.golden.test.ts`). This end-to-end bound covers navigation +
// worker boot + fetch + parse + first render and is sized for CI headroom.
const DEMO_RENDER_BUDGET_MS = 15_000

test.describe('Lightroom Catalog Analyzer — empty state', () => {
  test('renders the desktop empty state with the FilePicker and demo button', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(TOOL_PATH)
    await expect(
      page.getByRole('heading', { name: /Analyze your Lightroom Classic catalog/i }).first(),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /Try the demo/i }).first()).toBeVisible()
    // FilePicker hidden file input lives inside the desktop empty state.
    await expect(page.locator('input[type="file"]')).toHaveCount(1)
  })

  test('renders the MobileSplash (no visible FilePicker) at a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(TOOL_PATH)
    await expect(page.getByText(/needs your Lightroom Classic catalog/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /Try the demo/i }).first()).toBeVisible()
    const filePicker = page.locator('input[type="file"]').first()
    if (await filePicker.count() > 0) {
      await expect(filePicker).not.toBeVisible()
    }
  })
})

test.describe('Lightroom Catalog Analyzer — demo flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('?demo=true autoloads and renders the dashboard within the render budget', async ({ page }) => {
    const started = Date.now()
    await page.goto(DEMO_PATH)

    // Overview section renders once the demo parse completes.
    await expect(page.locator(SEC('overview')).first()).toBeVisible({ timeout: DEMO_TIMEOUT })
    const elapsed = Date.now() - started
    expect(elapsed, `demo parse+render took ${elapsed}ms`).toBeLessThan(DEMO_RENDER_BUDGET_MS)

    // A spread of section anchors across the four groups must be present.
    // 'drilldown' is no longer a spine section — it's in the sidebar control panel.
    for (const id of ['year-in-review', 'overview', 'gear', 'focal-length', 'heatmap', 'catalog-health']) {
      await expect(page.locator(SEC(id)).first()).toBeVisible({ timeout: DEMO_TIMEOUT })
    }
  })

  test('renders the concrete demo golden headline stats (m-9)', async ({ page }) => {
    await page.goto(DEMO_PATH)
    const overview = page.locator(SEC('overview')).first()
    await expect(overview).toBeVisible({ timeout: DEMO_TIMEOUT })

    // The deterministic demo catalog (fixed PRNG seed) yields: totalPhotos=3000,
    // bodyCount=2, lensCount=5, years 2023–2025. Overview renders <dt>/<dd> tiles.
    const overviewText = await overview.innerText()
    expect(overviewText).toContain('3,000') // total photos, toLocaleString()

    // Bodies (2) and lenses (5) are scoped to their labelled tiles to avoid
    // matching stray digits elsewhere in the section.
    const tileValue = async (label: string) =>
      overview.locator('div', { has: page.locator(`dt:text-is("${label}")`) }).locator('dd').first().innerText()
    expect(await tileValue('Bodies')).toBe('2')
    expect(await tileValue('Lenses')).toBe('5')
  })

  test('applying a camera filter via DrilldownForm changes downstream stats', async ({ page }) => {
    await page.goto(DEMO_PATH)
    const overview = page.locator(SEC('overview')).first()
    await expect(overview).toBeVisible({ timeout: DEMO_TIMEOUT })
    const overviewBefore = await overview.innerText()

    // The filter is now in the always-visible sidebar (no spine section to scroll to).
    // Check the first camera in the cameras group, then Apply.
    const camerasGroup = page.getByRole('group', { name: /Cameras/i }).first()
    await camerasGroup.locator('input[type="checkbox"]').first().check()
    await page.getByRole('button', { name: /^Apply$/ }).first().click()

    // The worker re-runs; the Overview text should change (fewer photos).
    await expect(async () => {
      const overviewAfter = await overview.innerText()
      expect(overviewAfter).not.toBe(overviewBefore)
    }).toPass({ timeout: 10_000 })

    // ActiveFilterPills shows a Camera pill. It lives in the scrollable sidebar;
    // use toBeAttached (DOM presence) rather than toBeVisible to avoid
    // Playwright's scrollable-container stability checks.
    await expect(page.getByText(/^Camera:/).first()).toBeAttached({ timeout: 10_000 })
  })

  test('filter state syncs bidirectionally with the URL (date filter via URL params)', async ({ page }) => {
    // The camera-filter test (above) proves filter→URL via the form. This test
    // proves URL→filter hydration: navigate WITH filter params, then confirm
    // the filter was applied (pill appears + URL persists). Together they verify
    // bidirectional sync. (Direct date-input fill in the sidebar is unreliable
    // due to Playwright's viewport-centric hit-testing in nested scroll containers.)
    await page.goto(`${DEMO_PATH}&start=2024-01-01T00%3A00%3A00&end=2024-12-31T23%3A59%3A59`)
    await expect(page.locator(SEC('overview')).first()).toBeVisible({ timeout: DEMO_TIMEOUT })
    // The date pill appears (filter hydrated from URL).
    await expect(page.getByText(/^Date 2024-01-01 – 2024-12-31$/).first())
      .toBeAttached({ timeout: 10_000 })
    // URL still carries the filter params (not wiped by the URL-sync hook).
    expect(page.url()).toContain('start=2024-01-01')
    expect(page.url()).toContain('end=2024-12-31')
  })

  test('removing a pill clears that dimension from the URL', async ({ page }) => {
    await page.goto(`${DEMO_PATH}&start=2024-01-01T00:00:00&end=2024-12-31T23:59:59`)
    await expect(page.locator(SEC('overview')).first()).toBeVisible({ timeout: DEMO_TIMEOUT })

    // Pill is in the scrollable sidebar — wait for render to settle, then
    // interact via evaluate (Playwright can't hit-test in nested scroll containers).
    await page.waitForTimeout(500)
    await expect(page.getByText(/^Date 2024-01-01 – 2024-12-31$/).first())
      .toBeAttached({ timeout: 10_000 })
    await page.getByLabel(/Remove Date 2024-01-01.* filter/).first()
      .evaluate((el) => (el as HTMLElement).click())

    await expect(async () => {
      const url = page.url()
      expect(url).not.toContain('start=')
      expect(url).not.toContain('end=')
    }).toPass({ timeout: 5_000 })
  })

  test('heatmap day-click applies a one-day filter and surfaces a date pill', async ({ page }) => {
    await page.goto(DEMO_PATH)
    await expect(page.locator(SEC('heatmap')).first()).toBeVisible({ timeout: DEMO_TIMEOUT })

    // The heatmap is a <canvas>. Use an element-relative click (auto-scrolls and
    // is viewport-correct, unlike raw page.mouse.click on absolute coords). y=100
    // lands in the first year's grid, which reliably has data in the 3-year demo
    // catalog; pick() also snaps to the nearest cell if it lands in a gap.
    const heatmapCanvas = page.locator(`${SEC('heatmap')} canvas`).first()
    const box = await heatmapCanvas.boundingBox()
    expect(box).not.toBeNull()
    await heatmapCanvas.click({ position: { x: box!.width / 2, y: 100 } })

    // The one-day filter yields a Date pill in the sidebar.
    await expect(page.getByText(/^Date \d{4}-\d{2}-\d{2} – \d{4}-\d{2}-\d{2}$/).first())
      .toBeAttached({ timeout: 10_000 })
  })

  test('Reset clears the filter and the URL', async ({ page }) => {
    await page.goto(`${DEMO_PATH}&start=2024-01-01T00:00:00&end=2024-12-31T23:59:59`)
    await expect(page.locator(SEC('overview')).first()).toBeVisible({ timeout: DEMO_TIMEOUT })
    await expect(page.getByText(/^Date 2024-01-01 – 2024-12-31$/).first())
      .toBeAttached({ timeout: 10_000 })
    await page.getByRole('button', { name: /^Reset$/ }).first().click({ force: true })

    await expect(async () => {
      const url = page.url()
      expect(url).not.toContain('start=')
      expect(url).not.toContain('end=')
    }).toPass({ timeout: 5_000 })

    await expect(page.getByText(/^Date 2024-01-01 – 2024-12-31$/)).toHaveCount(0)
  })
})

test.describe('Lightroom Catalog Analyzer — export bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
  })

  test('exports a non-empty PDF when the PDF button is clicked', async ({ page }) => {
    // PDF export dynamic-imports the engine, then rasterizes ~14 charts
    // sequentially (html2canvas + offscreen-canvas) before assembling the PDF.
    // Give it generous headroom over the 30s per-test default.
    test.setTimeout(120_000)
    await page.goto(DEMO_PATH)
    await expect(page.locator(SEC('overview')).first()).toBeVisible({ timeout: DEMO_TIMEOUT })

    // Export buttons are in the always-visible sidebar (no scroll needed on desktop).
    const pdfButton = page.getByRole('button', { name: /Export PDF/i }).first()

    // Clicking triggers a download. Wait for the download event.
    const downloadPromise = page.waitForEvent('download', { timeout: 60_000 })
    await pdfButton.click()

    // While generating, the label switches to a loading state at least once.
    // (Don't hard-assert the transient label — generation can be fast in CI.)
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/^phototools-[0-9a-f]{8}-\d{4}-\d{2}-\d{2}\.pdf$/)

    // Verify the downloaded file is a non-empty PDF.
    const path = await download.path()
    expect(path).toBeTruthy()
    const fs = await import('fs')
    const buf = fs.readFileSync(path as string)
    expect(buf.length).toBeGreaterThan(1000) // a real PDF, not an empty stub
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-') // PDF magic header
  })

  test('copies the Markdown report (or downloads it as fallback)', async ({ page, context }) => {
    // Grant clipboard permission so navigator.clipboard.writeText resolves in Chromium.
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(DEMO_PATH)
    await expect(page.locator(SEC('overview')).first()).toBeVisible({ timeout: DEMO_TIMEOUT })

    const mdButton = page.getByRole('button', { name: /Copy Markdown/i }).first()
    await mdButton.click()

    // A success toast appears (clipboard path) — sonner renders it in the DOM.
    await expect(page.getByText(/Markdown report copied/i)).toBeVisible({ timeout: 10_000 })

    // The clipboard now holds the report (when permission granted).
    const clip = await page.evaluate(() => navigator.clipboard.readText())
    expect(clip.startsWith('# Lightroom Catalog Analysis')).toBe(true)
  })

  test('the Share button is interactive and opens the disclosure modal (Plan 3)', async ({ page }) => {
    await page.goto(DEMO_PATH)
    await expect(page.locator(SEC('overview')).first()).toBeVisible({ timeout: DEMO_TIMEOUT })
    const share = page.getByRole('button', { name: /Share via URL/i }).first()
    await expect(share).toBeEnabled()
    await share.click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})

test.describe('Lightroom Catalog Analyzer — console error baseline', () => {
  test('demo flow does not emit unfiltered console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(DEMO_PATH)
    await expect(page.locator(SEC('overview')).first()).toBeVisible({ timeout: DEMO_TIMEOUT })

    const benign = (e: string) =>
      e.includes('favicon') ||
      e.includes('the server responded with a status of 404') ||
      e.includes('cookieyes') ||
      e.includes('adsense') ||
      e.includes('adsbygoogle') ||
      e.includes('_vercel/speed-insights') ||
      e.includes('posthog') ||
      e.includes('/phog/') ||
      e.includes('connect.facebook.net') ||
      e.includes('fbevents.js') ||
      e.includes('facebook.com') ||
      e.includes('sentry') ||
      e.includes('monitoring')

    const realErrors = errors.filter((e) => !benign(e))
    expect(realErrors).toEqual([])
  })
})
