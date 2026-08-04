import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.join(__dirname, '../fixtures/test-image.jpg')
/** Nikon-structured JPEG (Make/Model + MakerNote ShutterCount=48213). See scripts/build-nikon-fixture.mjs. */
const NIKON_FIXTURE = path.join(__dirname, '../fixtures/nikon-shutter-count.jpg')
const NIKON_COUNT = '48,213'

/**
 * Both file tools parse entirely client-side. Two fixtures on purpose:
 * `FIXTURE` has no maker notes and covers the graceful no-data paths;
 * `NIKON_FIXTURE` carries a real APP1/TIFF/MakerNote chain and covers the
 * actual read path end-to-end — drop → FileReader → parser + exifreader →
 * React state → rendered count. The parser alone is unit-tested separately.
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

  test('reads and displays the shutter count from a Nikon file', async ({ page }) => {
    await page.locator('input[type="file"]').first().setInputFiles(NIKON_FIXTURE)

    const result = page.locator('[class*="result"]').first()
    await expect(result).toBeVisible({ timeout: 10_000 })
    await expect(result.locator('[class*="countValue"]')).toHaveText(NIKON_COUNT)
    await expect(result).toContainText('Nikon Z8')          // resolved via the release database
    await expect(result).toContainText('actual mechanical')  // source note for a true ShutterCount
  })

  test('rated-life selector recomputes the life-used percentage', async ({ page }) => {
    await page.locator('input[type="file"]').first().setInputFiles(NIKON_FIXTURE)
    const result = page.locator('[class*="result"]').first()
    await expect(result).toBeVisible({ timeout: 10_000 })

    const percent = result.locator('[class*="lifePercent"]')
    const before = await percent.textContent()

    // Drop from the 200k default to the 100k entry-level rating — same count, higher % used.
    await result.locator('select').selectOption('0')
    await expect.poll(async () => await percent.textContent()).not.toBe(before)

    // 48,213 of 100,000 → ~48%, which lands in the "moderate" band.
    await expect(percent).toContainText('48%')
    await expect(result.locator('[class*="badge"]')).toBeVisible()
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
      expect(await report.locator('section[class*="card"]').count()).toBe(4)
      await expect(report).toContainText('Shutter life')
    }
  })

  test('builds a full health report from a Nikon file', async ({ page }) => {
    await page.locator('input[type="file"]').first().setInputFiles(NIKON_FIXTURE)

    const report = page.locator('[class*="grid"]').first()
    await expect(report).toBeVisible({ timeout: 10_000 })
    expect(await report.locator('section[class*="card"]').count()).toBe(4)

    // Body section: model resolved through the release database, not the raw EXIF string
    await expect(report).toContainText('Nikon Z8')
    await expect(report).toContainText('NIKON CORPORATION')

    // Age is derived from the release-year lookup (Z8 = 2023), so it must not be a dash
    await expect(report).toContainText('2023')

    // Shutter section: count read from the MakerNote, rated life from the same lookup
    await expect(report).toContainText(NIKON_COUNT)
    await expect(report).toContainText('500,000')
    await expect(report.locator('[class*="lifePercent"]')).toContainText('10%')
  })
})
