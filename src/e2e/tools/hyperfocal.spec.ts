import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

function sidebar(page: Page) {
  return page.locator('[class*="sidebar"]').first()
}

test.describe('Hyperfocal Simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hyperfocal-simulator')
  })

  test('focal length dropdown changes hyperfocal distance', async ({ page }) => {
    const panel = sidebar(page)

    // Target the hyperfocal distance value (inside the large monospace display, after the label)
    const hyperfocalLabel = panel.getByText('Hyperfocal Distance', { exact: true })
    const hyperfocalValue = hyperfocalLabel.locator('..').locator('div[style*="font-mono"]')
    const initial = await hyperfocalValue.textContent()

    // Change focal length to 200mm
    const flSelect = panel.locator('select').first()
    await flSelect.selectOption('200')

    const updated = await hyperfocalValue.textContent()
    expect(updated).not.toBe(initial)
  })

  test('aperture dropdown changes hyperfocal distance', async ({ page }) => {
    const panel = sidebar(page)

    const hyperfocalLabel = panel.getByText('Hyperfocal Distance', { exact: true })
    const hyperfocalValue = hyperfocalLabel.locator('..').locator('div[style*="font-mono"]')
    const initial = await hyperfocalValue.textContent()

    // Change aperture to f/2.8
    const apSelect = panel.locator('select').nth(1)
    await apSelect.selectOption('2.8')

    const updated = await hyperfocalValue.textContent()
    expect(updated).not.toBe(initial)
  })

  test('sensor dropdown changes hyperfocal distance', async ({ page }) => {
    const panel = sidebar(page)

    const hyperfocalLabel = panel.getByText('Hyperfocal Distance', { exact: true })
    const hyperfocalValue = hyperfocalLabel.locator('..').locator('div[style*="font-mono"]')
    const initial = await hyperfocalValue.textContent()

    // Change sensor to APS-C (Nikon)
    const sensorSelect = panel.locator('select').nth(2)
    await sensorSelect.selectOption('apsc_n')

    const updated = await hyperfocalValue.textContent()
    expect(updated).not.toBe(initial)
  })

  test('results panel displays hyperfocal, near limit, far limit, and focus distance', async ({ page }) => {
    const panel = sidebar(page)

    // Hyperfocal distance label (exact match to avoid matching page title)
    await expect(panel.getByText('Hyperfocal Distance', { exact: true })).toBeVisible()

    // Near and far limit labels
    await expect(panel.getByText('Near Limit')).toBeVisible()
    await expect(panel.getByText('Far Limit')).toBeVisible()

    // Focus distance result
    await expect(panel.getByText('Focus Distance').last()).toBeVisible()
  })

  test('canvas/diagram renders', async ({ page }) => {
    // DoFCanvas renders a canvas element
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })

  test('scene preset buttons toggle active state', async ({ page }) => {
    const topbar = page.locator('[class*="canvasTopbar"]').first()

    // Find scene buttons
    const landscapeBtn = topbar.locator('button[aria-pressed]', { hasText: 'Landscape' }).first()
    const streetBtn = topbar.locator('button[aria-pressed]', { hasText: 'Street' }).first()

    // Default should be landscape active
    await expect(landscapeBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(streetBtn).toHaveAttribute('aria-pressed', 'false')

    // Click street
    await streetBtn.click()
    await expect(streetBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(landscapeBtn).toHaveAttribute('aria-pressed', 'false')
  })

  test('scene change updates canvas', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    const before = await canvas.screenshot()

    // Switch to Street scene
    const topbar = page.locator('[class*="canvasTopbar"]').first()
    await topbar.locator('button[aria-pressed]', { hasText: 'Street' }).first().click()
    await page.waitForTimeout(500)

    const after = await canvas.screenshot()
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('mini reference table shows all apertures', async ({ page }) => {
    const panel = sidebar(page)

    // Mini table should list all 9 standard apertures
    await expect(panel.getByText('Hyperfocal Reference')).toBeVisible()
    const table = panel.locator('table').first()
    const rows = table.locator('tbody tr')
    expect(await rows.count()).toBe(9) // APERTURES has 9 entries
  })

  test('URL state persistence', async ({ page }) => {
    const panel = sidebar(page)

    // Set focal length to 85mm, aperture to f/2
    await panel.locator('select').first().selectOption('85')
    await panel.locator('select').nth(1).selectOption('2')

    // useToolQuerySync writes a single throttled snapshot of the FULL state,
    // not one write per field. Two separate actions can land as separate
    // snapshots under load, so poll on the LAST-set param (f=2) — once it
    // appears, the write is guaranteed to include everything set before it.
    await expect.poll(() => page.url()).toContain('f=2')

    const url = page.url()
    expect(url).toContain('fl=85')

    // Reload and verify state is restored
    await page.goto(url)
    await page.waitForTimeout(500)

    const restoredPanel = sidebar(page)
    await expect(restoredPanel.locator('select').first()).toHaveValue('85')
    await expect(restoredPanel.locator('select').nth(1)).toHaveValue('2')
  })
})
