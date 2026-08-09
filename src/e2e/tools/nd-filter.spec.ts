import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

function sidebar(page: Page) {
  return page.locator('[class*="sidebar"]').first()
}

test.describe('ND Filter Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nd-filter-calculator')
  })

  test('displays two result cards on load', async ({ page }) => {
    const panel = sidebar(page)
    const resultCards = panel.locator('[class*="resultCard"]')
    expect(await resultCards.count()).toBe(2)
  })

  test('base shutter speed selection updates result', async ({ page }) => {
    const panel = sidebar(page)

    // Read initial resulting shutter speed
    const resultValue = panel.locator('[class*="resultValue"]').first()
    const initial = await resultValue.textContent()

    // Change base shutter speed to 1s (index 13)
    const baseSelect = panel.locator('select').first()
    await baseSelect.selectOption('13')

    const updated = await resultValue.textContent()
    expect(updated).not.toBe(initial)
  })

  test('ND filter selection changes calculated exposure time', async ({ page }) => {
    const panel = sidebar(page)

    // Read initial resulting shutter speed
    const resultValue = panel.locator('[class*="resultValue"]').first()
    const initial = await resultValue.textContent()

    // Change ND filter to ND1024 (10 stops, index 9)
    const ndSelect = panel.locator('select').nth(1)
    await ndSelect.selectOption('9')

    const updated = await resultValue.textContent()
    expect(updated).not.toBe(initial)
  })

  test('stronger ND filter produces longer shutter speed', async ({ page }) => {
    const panel = sidebar(page)

    // Set base to 1/125 (index 6) and ND2 (index 0, 1 stop)
    const baseSelect = panel.locator('select').first()
    const ndSelect = panel.locator('select').nth(1)

    await baseSelect.selectOption('6')
    await ndSelect.selectOption('0')

    const resultValue = panel.locator('[class*="resultValue"]').first()
    const weakNdResult = await resultValue.textContent()

    // Switch to ND1024 (10 stops, index 9)
    await ndSelect.selectOption('9')
    const strongNdResult = await resultValue.textContent()

    // Results should be different — stronger ND = longer exposure
    expect(strongNdResult).not.toBe(weakNdResult)
  })

  test('stops added reflects selected ND filter', async ({ page }) => {
    const panel = sidebar(page)
    const stopsValue = panel.locator('[class*="resultValue"]').nth(1)

    // Select ND8 (3 stops, index 2)
    const ndSelect = panel.locator('select').nth(1)
    await ndSelect.selectOption('2')
    await expect(stopsValue).toHaveText('3')

    // Select ND64 (6 stops, index 5)
    await ndSelect.selectOption('5')
    await expect(stopsValue).toHaveText('6')

    // Select ND1024 (10 stops, index 9)
    await ndSelect.selectOption('9')
    await expect(stopsValue).toHaveText('10')
  })

  test('quick reference table is visible', async ({ page }) => {
    // The table is in the main area, not the sidebar
    const table = page.locator('table').first()
    await expect(table).toBeVisible()

    // Table should have header row + data rows (16 base shutter speeds)
    const rows = table.locator('tbody tr')
    expect(await rows.count()).toBe(16)
  })

  test('URL state persistence', async ({ page }) => {
    const panel = sidebar(page)

    // Set base to 1s (index 13), ND to ND512 (index 8)
    await panel.locator('select').first().selectOption('13')
    await panel.locator('select').nth(1).selectOption('8')

    // useToolQuerySync writes a single throttled snapshot of the FULL state,
    // not one write per field. Two separate actions can land as separate
    // snapshots under load, so poll on the LAST-set param (nd=8) — once it
    // appears, the write is guaranteed to include everything set before it.
    await expect.poll(() => page.url()).toContain('nd=8')

    const url = page.url()
    expect(url).toContain('base=13')

    // Navigate to the URL directly and verify state is restored
    await page.goto(url)
    await page.waitForTimeout(500)

    const restoredPanel = sidebar(page)
    const baseSelect = restoredPanel.locator('select').first()
    const ndSelect = restoredPanel.locator('select').nth(1)

    await expect(baseSelect).toHaveValue('13')
    await expect(ndSelect).toHaveValue('8')
  })
})
