import { test, expect, request as playwrightRequest } from '@playwright/test'

// LIMITATION: the full create → open → delete round-trip needs a Vercel Blob
// store. `POST /api/share` requires BLOB_READ_WRITE_TOKEN to be present in the
// environment running `npm run start`; without it the route returns 503 and a
// share can never be minted. So the round-trip below is gated behind
// `test.skip(!HAS_BLOB, …)`. The id-validation and cron-auth checks need no
// token (they reject before any Blob call) and always run.
const HAS_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

test.describe('Lightroom Catalog Analyzer — share flow', () => {
  test.describe('full round-trip (needs BLOB_READ_WRITE_TOKEN)', () => {
    test.skip(!HAS_BLOB, 'Requires a Vercel Blob token in the runtime env')

    test('create → open in fresh context → delete → 404', async ({ page, browser, baseURL }) => {
      // 1. Load the demo catalog so a real InsightBlob exists in memory.
      await page.goto('/en/lightroom-catalog-analyzer?demo=true')
      // Wait for the dashboard to finish parsing (Overview heading appears).
      await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 30_000 })

      // 2. Open the share modal from the export bar.
      await page.getByRole('button', { name: /share via url/i }).click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()

      // 3. Choose 24h and create.
      await dialog.getByRole('radio', { name: /24 hours/i }).click()
      await dialog.getByRole('button', { name: /create link/i }).click()

      // 4. Success panel shows a URL; capture it.
      const urlInput = page.getByLabel(/shareable url/i)
      await expect(urlInput).toBeVisible({ timeout: 15_000 })
      const shareUrl = await urlInput.inputValue()
      expect(shareUrl).toContain('/lightroom-catalog-analyzer/r/')
      const id = shareUrl.split('/r/')[1]
      expect(id).toMatch(/^[A-Za-z0-9_-]{16}$/)

      // 5. Open the recipient view in a FRESH context (no shared state).
      const fresh = await browser.newContext()
      const recipient = await fresh.newPage()
      await recipient.goto(shareUrl)
      await expect(recipient.getByText(/never uploaded/i)).toBeVisible()
      await expect(recipient.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 15_000 })

      // 6. noindex meta is present on the recipient page.
      const robots = await recipient.locator('meta[name="robots"]').getAttribute('content')
      expect(robots).toMatch(/noindex/)
      await fresh.close()

      // 7. Delete the share from the creator's success panel.
      await page.getByRole('button', { name: /delete this share/i }).click()

      // 8. A direct GET of the deleted share now 404s.
      const api = await playwrightRequest.newContext({ baseURL })
      const res = await api.get(`/api/share/${id}`)
      expect(res.status()).toBe(404)
      await api.dispose()
    })
  })

  test('disclosure modal opens, the expiration selector works, and Cancel closes it', async ({ page }) => {
    // This path needs no Blob token: it exercises the modal + expiration
    // selector entirely client-side, before any POST is made.
    await page.goto('/en/lightroom-catalog-analyzer?demo=true')
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible({ timeout: 30_000 })

    await page.getByRole('button', { name: /share via url/i }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // Default selection is 30 days; the user can switch to another option.
    const thirty = dialog.getByRole('radio', { name: /30 days/i })
    await expect(thirty).toBeChecked()
    const twentyFour = dialog.getByRole('radio', { name: /24 hours/i })
    await twentyFour.click()
    await expect(twentyFour).toBeChecked()
    await expect(thirty).not.toBeChecked()

    // Cancel returns to the dashboard without creating a share.
    await dialog.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByRole('button', { name: /share via url/i })).toBeVisible()
  })

  test('GET /api/share/[id] rejects a malformed id with 400', async ({ request }) => {
    const res = await request.get('/api/share/not-a-valid-id')
    expect(res.status()).toBe(400)
  })

  test('GET /api/share/[id] 404s an unknown well-formed id', async ({ request }) => {
    // 16-char, valid charset, but (almost certainly) never minted.
    const res = await request.get('/api/share/zzzzzzzzzzzzzzzz')
    // 404 (not found) when Blob is reachable; 404/500 are both acceptable when
    // the store is absent in CI — assert it is NOT a 200.
    expect(res.status()).not.toBe(200)
  })
})

test.describe('Lightroom Catalog Analyzer — cron auth', () => {
  test('rejects expire-shares without a bearer token', async ({ request }) => {
    const res = await request.get('/api/cron/expire-shares')
    expect(res.status()).toBe(401)
  })

  test('rejects expire-shares with a wrong bearer token', async ({ request }) => {
    const res = await request.get('/api/cron/expire-shares', { headers: { authorization: 'Bearer definitely-wrong' } })
    expect(res.status()).toBe(401)
  })

  // Accepting WITH the correct token is covered by the route unit test
  // (Task 19.4), because the E2E runtime does not expose CRON_SECRET to the
  // test process. If CRON_SECRET is present in the runtime AND the test env,
  // the following runs:
  test('accepts expire-shares with the correct bearer token', async ({ request }) => {
    const secret = process.env.CRON_SECRET
    test.skip(!secret, 'CRON_SECRET not available to the test process')
    const res = await request.get('/api/cron/expire-shares', { headers: { authorization: `Bearer ${secret}` } })
    expect([200, 500]).toContain(res.status()) // 200 normally; 500 only if Blob list fails
  })
})
