import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

function sidebar(page: Page) {
  return page.locator('[class*="sidebar"]').first()
}

test.describe('White Balance Visualizer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/white-balance-visualizer')
  })

  test('temperature slider updates RGB values', async ({ page }) => {
    const panel = sidebar(page)

    // Get initial hex value (4th result card)
    const hexValue = panel.locator('[class*="resultValue"]').nth(3)
    const initial = await hexValue.textContent()

    // Move temperature slider to a warm value
    const slider = panel.locator('input[type="range"]').first()
    await slider.fill('2000')

    const updated = await hexValue.textContent()
    expect(updated).not.toBe(initial)
  })

  test('preset buttons set temperature', async ({ page }) => {
    const panel = sidebar(page)

    // Click Tungsten preset (2700K)
    const tungstenBtn = panel.locator('button[title="Tungsten (2700K)"]')
    await tungstenBtn.click()

    // Slider should reflect 2700
    const slider = panel.locator('input[type="range"]').first()
    await expect(slider).toHaveValue('2700')
  })

  test('displays 4 RGB result cards', async ({ page }) => {
    const panel = sidebar(page)
    const resultValues = panel.locator('[class*="resultValue"]')
    expect(await resultValues.count()).toBe(4)
  })

  test('RGB values are in valid range', async ({ page }) => {
    const panel = sidebar(page)
    const resultValues = panel.locator('[class*="resultValue"]')

    // Check R, G, B are 0-255
    for (let i = 0; i < 3; i++) {
      const text = await resultValues.nth(i).textContent()
      const value = parseInt(text!, 10)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(255)
    }

    // Check hex is a valid color
    const hex = await resultValues.nth(3).textContent()
    expect(hex).toMatch(/^#[0-9a-f]{6}$/i)
  })

  test('warm temperature has high red, low blue', async ({ page }) => {
    const panel = sidebar(page)

    // Set to a very warm temperature
    await panel.locator('input[type="range"]').first().fill('2000')

    const resultValues = panel.locator('[class*="resultValue"]')
    const red = parseInt((await resultValues.nth(0).textContent())!, 10)
    const blue = parseInt((await resultValues.nth(2).textContent())!, 10)
    expect(red).toBeGreaterThan(blue)
  })

  test('URL state persistence', async ({ page }) => {
    const panel = sidebar(page)

    // Set temperature to 3500K
    await panel.locator('input[type="range"]').first().fill('3500')

    // useToolQuerySync throttles the replaceState write, so poll rather than
    // sleeping a fixed interval — a fixed wait races the throttle under load.
    await expect.poll(() => page.url()).toContain('k=')

    const url = page.url()

    // Reload and verify
    await page.goto(url)
    await page.waitForTimeout(300)
    const slider = sidebar(page).locator('input[type="range"]').first()
    await expect(slider).toHaveValue('3500')
  })
})
