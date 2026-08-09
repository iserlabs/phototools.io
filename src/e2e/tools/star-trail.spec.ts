import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

function sidebar(page: Page) {
  return page.locator('[class*="sidebar"]').first()
}

function topbar(page: Page) {
  return page.locator('[class*="topbar"]').first()
}

test.describe('Star Trail Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/star-trail-calculator')
  })

  test('mode toggle switches between Star Trails and Single Shot', async ({ page }) => {
    const panel = sidebar(page)

    // Find mode toggle buttons
    const trailsBtn = panel.locator('button[aria-pressed]', { hasText: 'Star Trails' }).first()
    const singleBtn = panel.locator('button[aria-pressed]', { hasText: 'Single Shot' }).first()

    // Default should be one mode active
    const trailsPressed = await trailsBtn.getAttribute('aria-pressed')
    const singlePressed = await singleBtn.getAttribute('aria-pressed')
    expect(trailsPressed !== singlePressed).toBe(true)

    // Click the inactive one
    if (trailsPressed === 'true') {
      await singleBtn.click()
      await expect(singleBtn).toHaveAttribute('aria-pressed', 'true')
      await expect(trailsBtn).toHaveAttribute('aria-pressed', 'false')
    } else {
      await trailsBtn.click()
      await expect(trailsBtn).toHaveAttribute('aria-pressed', 'true')
      await expect(singleBtn).toHaveAttribute('aria-pressed', 'false')
    }
  })

  test('latitude preset buttons update slider', async ({ page }) => {
    // Preset buttons are in the topbar above the canvas, not inside the sidebar
    const bar = topbar(page)

    // Click "Equator 0°" preset
    const equatorBtn = bar.locator('button', { hasText: 'Equator' }).first()
    await equatorBtn.click()
    await expect(equatorBtn).toHaveClass(/Active/)

    // Click "Arctic 70°" preset
    const arcticBtn = bar.locator('button', { hasText: 'Arctic' }).first()
    await arcticBtn.click()
    await expect(arcticBtn).toHaveClass(/Active/)
  })

  test('canvas is visible', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })

  test('results display rule calculations', async ({ page }) => {
    const panel = sidebar(page)
    // Should display resultCardAccent cards (both match [class*="resultCard"])
    const resultCards = panel.locator('[class*="resultCard"]')
    expect(await resultCards.count()).toBeGreaterThanOrEqual(2)
  })

  test('URL state persistence', async ({ page }) => {
    const bar = topbar(page)

    // Click Arctic preset to set latitude
    await bar.locator('button', { hasText: 'Arctic' }).first().click()

    // useToolQuerySync throttles the replaceState write, so poll rather than
    // sleeping a fixed interval — a fixed wait races the throttle under load.
    await expect.poll(() => page.url()).toContain('lat=')

    const url = page.url()

    // Reload and verify
    await page.goto(url)
    await page.waitForTimeout(300)
    const arcticBtn = topbar(page).locator('button', { hasText: 'Arctic' }).first()
    await expect(arcticBtn).toHaveClass(/Active/)
  })
})
