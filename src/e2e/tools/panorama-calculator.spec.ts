import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

function sidebar(page: Page) {
  return page.locator('[class*="sidebar"]').first()
}

/**
 * Locate a control by its visible label rather than by position — the sidebar
 * renders several selects (sensor, panorama width, rows) and positional
 * indexes break whenever a control is added or reordered.
 */
function fieldSelect(page: Page, label: string) {
  return sidebar(page)
    .locator('[class*="field"]')
    .filter({ has: page.locator(`label:text-is("${label}")`) })
    .locator('select')
}

/** Result cards render in document order: total, perRow, rotate, coverage, frameFov, stitched. */
function resultValue(page: Page, index: number) {
  return page.locator('[class*="main"] [class*="resultValue"]').nth(index)
}

test.describe('Panorama Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/panorama-calculator')
  })

  test('renders six result cards and a fan diagram', async ({ page }) => {
    expect(await page.locator('[class*="main"] [class*="resultCard"]').count()).toBe(6)
    await expect(page.locator('svg[role="img"]')).toBeVisible()
  })

  test('a longer lens requires more shots for the same panorama', async ({ page }) => {
    const totalShots = resultValue(page, 0)
    const initial = Number(await totalShots.textContent())

    // FocalLengthField exposes a range input; push it toward telephoto.
    const focalSlider = sidebar(page).locator('input[type="range"]').first()
    await focalSlider.fill('900')
    await focalSlider.dispatchEvent('input')

    await expect.poll(async () => Number(await totalShots.textContent())).toBeGreaterThan(initial)
  })

  test('more overlap requires more shots', async ({ page }) => {
    const totalShots = resultValue(page, 0)
    const panel = sidebar(page)
    const overlap = panel.locator('input[type="range"]').nth(1)

    await overlap.fill('10')
    await overlap.dispatchEvent('input')
    const low = Number(await totalShots.textContent())

    await overlap.fill('60')
    await overlap.dispatchEvent('input')
    await expect.poll(async () => Number(await totalShots.textContent())).toBeGreaterThan(low)
  })

  test('adding rows multiplies the total frame count', async ({ page }) => {
    const totalShots = resultValue(page, 0)
    const single = Number(await totalShots.textContent())

    await fieldSelect(page, 'Rows').selectOption('3')

    await expect.poll(async () => Number(await totalShots.textContent())).toBe(single * 3)
  })

  test('state syncs to the URL for sharing', async ({ page }) => {
    await fieldSelect(page, 'Rows').selectOption('2')
    await expect.poll(() => page.url()).toContain('rows=2')
  })

  test('restores state from URL parameters', async ({ page }) => {
    await page.goto('/panorama-calculator?rows=4&overlap=50&target=360')
    await expect(fieldSelect(page, 'Rows')).toHaveValue('4')
  })
})
