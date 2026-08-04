import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

function sidebar(page: Page) {
  return page.locator('[class*="sidebar"]').first()
}

/** Locate a control by its visible label rather than by position. */
function fieldSelect(page: Page, label: string) {
  return sidebar(page)
    .locator('[class*="field"]')
    .filter({ has: page.locator(`label:text-is("${label}")`) })
    .locator('select')
}

/** Result cards: pixel pitch, Airy disk, diffraction limit. */
function resultValue(page: Page, index: number) {
  return page.locator('[class*="main"] [class*="resultValue"]').nth(index)
}

test.describe('Diffraction Limit Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/diffraction-calculator')
  })

  test('shows pixel pitch, Airy disk, and the diffraction limit', async ({ page }) => {
    expect(await page.locator('[class*="main"] [class*="resultCard"]').count()).toBe(3)
    await expect(resultValue(page, 0)).toContainText('µm')
    await expect(resultValue(page, 2)).toContainText('f/')
  })

  test('more megapixels lowers the diffraction limit', async ({ page }) => {
    const limit = resultValue(page, 2)
    const parseF = async () => Number((await limit.textContent())!.replace('f/', ''))

    const mpSlider = sidebar(page).locator('input[type="range"]').first()
    await mpSlider.fill('12')
    await mpSlider.dispatchEvent('input')
    const lowMp = await parseF()

    await mpSlider.fill('100')
    await mpSlider.dispatchEvent('input')
    await expect.poll(parseF).toBeLessThan(lowMp)
  })

  test('stopping down past the limit changes the verdict to soft', async ({ page }) => {
    const badge = page.locator('[class*="verdictBadge"]')
    const apertureSelect = fieldSelect(page, 'Aperture')

    // f/1 — wide open, far below any limit
    await apertureSelect.selectOption('0')
    const wideOpen = await badge.textContent()

    // f/64 — the last entry on the third-stop scale
    const optionCount = await apertureSelect.locator('option').count()
    await apertureSelect.selectOption(String(optionCount - 1))

    await expect.poll(async () => await badge.textContent()).not.toBe(wideOpen)
  })

  test('aperture strip marks each stop and the reference table renders', async ({ page }) => {
    const strip = page.locator('[class*="strip"]').first()
    await expect(strip).toBeVisible()
    expect(await strip.locator('[class*="stop"]').count()).toBeGreaterThan(5)
    expect(await page.locator('table tbody tr').count()).toBeGreaterThan(3)
  })

  test('state syncs to the URL for sharing', async ({ page }) => {
    await fieldSelect(page, 'Aperture').selectOption('0')
    await expect.poll(() => page.url()).toContain('ap=0')
  })
})
