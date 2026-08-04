import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.join(__dirname, '../fixtures/test-image.jpg')

/**
 * Both file tools parse entirely client-side. The shared fixture is a minimal
 * JPEG with no maker notes, so these assert the graceful no-data paths as well
 * as the parse plumbing — the Nikon MakerNote decoding itself is unit-tested
 * against synthetic fixtures in src/lib/utils/shutter-count.test.ts.
 */

test.describe('Shutter Count Checker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shutter-count-checker')
  })

  test('lists the per-brand support matrix', async ({ page }) => {
    const matrix = page.locator('[class*="matrix"]').first()
    await expect(matrix).toBeVisible()
    expect(await matrix.locator('[class*="matrixRow"]').count()).toBe(8)
    await expect(matrix).toContainText('Nikon')
    await expect(matrix).toContainText('Canon')
  })

  test('explains that Canon does not store the count in files', async ({ page }) => {
    await expect(page.locator('[class*="matrix"]').first())
      .toContainText('Canon never writes the shutter count into image files')
  })

  test('handles a photo with no shutter-count metadata without crashing', async ({ page }) => {
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE)
    // Either the no-count explainer or the read error — never an unhandled crash
    await expect(
      page.locator('[class*="noCount"], [class*="error"], [class*="result"]').first()
    ).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Camera Health Checker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/camera-health-checker')
  })

  test('shows an empty state before a file is chosen', async ({ page }) => {
    await expect(page.locator('[class*="empty"]').first()).toBeVisible()
  })

  test('renders the four report sections after upload, or a clear error', async ({ page }) => {
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE)

    const report = page.locator('[class*="grid"]').first()
    const error = page.locator('[class*="error"]').first()
    await expect(report.or(error)).toBeVisible({ timeout: 10_000 })

    if (await report.isVisible()) {
      expect(await report.locator('[class*="card"]').count()).toBe(4)
      await expect(report).toContainText('Shutter life')
    }
  })
})
