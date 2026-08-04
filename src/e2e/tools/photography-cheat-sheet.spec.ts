import { test, expect } from '@playwright/test'

test.describe('Photography Cheat Sheet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/photography-cheat-sheet')
  })

  test('renders the default portrait sheet with six settings rows', async ({ page }) => {
    const sheet = page.locator('[class*="sheet"]').first()
    await expect(sheet).toBeVisible()
    expect(await sheet.locator('[class*="settingRow"]').count()).toBe(6)
    await expect(sheet.locator('[class*="sheetTitle"]')).toHaveText('Portraits')
  })

  test('picking a scenario swaps the settings and tips', async ({ page }) => {
    const sheet = page.locator('[class*="sheet"]').first()
    const firstValue = sheet.locator('[class*="settingValue"]').first()
    const before = await firstValue.textContent()

    await page.locator('[class*="sidebar"]').first()
      .locator('button:text-is("Milky Way")').click()

    await expect(sheet.locator('[class*="sheetTitle"]')).toHaveText('Milky Way')
    await expect.poll(async () => await firstValue.textContent()).not.toBe(before)
  })

  test('every scenario renders a complete sheet with tips', async ({ page }) => {
    const buttons = page.locator('[class*="sidebar"]').first().locator('[class*="scenarioBtn"]')
    const count = await buttons.count()
    expect(count).toBe(10)

    for (let i = 0; i < count; i++) {
      await buttons.nth(i).click()
      const sheet = page.locator('[class*="sheet"]').first()
      expect(await sheet.locator('[class*="settingRow"]').count()).toBe(6)
      expect(await sheet.locator('[class*="tip"]').count()).toBeGreaterThan(0)
      // No untranslated key paths leaked into the rendered card
      await expect(sheet).not.toContainText('scenarios.')
      await expect(sheet).not.toContainText('values.')
    }
  })

  test('scenario is shareable via the URL', async ({ page }) => {
    await page.locator('[class*="sidebar"]').first()
      .locator('button:text-is("Wildlife & birds")').click()
    await expect.poll(() => page.url()).toContain('scene=wildlife')
  })

  test('restores the scenario from a shared URL', async ({ page }) => {
    await page.goto('/photography-cheat-sheet?scene=macro')
    await expect(page.locator('[class*="sheetTitle"]').first()).toHaveText('Macro')
  })
})
