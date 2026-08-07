import { expect, test } from '@playwright/test'

// Phase A invariant: with zero LIVE guides, the entire guides section is
// invisible in production. Replace this spec with the full guides.spec.ts
// interaction suite when the first guide goes live (Phase B).
test.describe('guides section — Phase A (no live guides)', () => {
  test('guides index returns 404', async ({ page }) => {
    const response = await page.goto('/en/guides')
    expect(response?.status()).toBe(404)
  })

  test('guide article routes return 404', async ({ page }) => {
    const response = await page.goto('/en/guides/macro-photography-getting-started')
    expect(response?.status()).toBe(404)
  })

  test('nav and footer show no guides link', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('nav a[href$="/guides"]')).toHaveCount(0)
    await expect(page.locator('footer a[href$="/guides"]')).toHaveCount(0)
  })

  test('homepage shows no guides teaser', async ({ page }) => {
    await page.goto('/en')
    await expect(page.locator('a[href$="/en/guides"]')).toHaveCount(0)
  })
})
