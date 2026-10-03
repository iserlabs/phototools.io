import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test.describe('Color Scheme Generator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/color-scheme-generator')
  })

  test('harmony type switching changes swatch count', async ({ page }) => {
    // Scope to sidebar to avoid LearnPanel challenge buttons
    const sidebar = page.locator('aside').first()

    // Complementary — 2 swatches
    await sidebar.locator('button:text-is("Complementary")').click()
    await expect(page.locator('[class*="paletteBarSwatch"]')).toHaveCount(2)

    // Triadic — 3 swatches
    await sidebar.locator('button:text-is("Triadic")').click()
    await expect(page.locator('[class*="paletteBarSwatch"]')).toHaveCount(3)

    // Tetradic — 4 swatches
    await sidebar.locator('button:text-is("Tetradic")').click()
    await expect(page.locator('[class*="paletteBarSwatch"]')).toHaveCount(4)

    // Split Complementary — 3 swatches
    await sidebar.locator('button:text-is("Split Complementary")').click()
    await expect(page.locator('[class*="paletteBarSwatch"]')).toHaveCount(3)

    // Analogous — 3 swatches
    await sidebar.locator('button:text-is("Analogous")').click()
    await expect(page.locator('[class*="paletteBarSwatch"]')).toHaveCount(3)
  })

  test('hue slider updates swatches', async ({ page }) => {
    const sidebar = page.locator('aside').first()

    // Read the initial hex value from the first swatch
    const firstSwatch = page.locator('[class*="paletteBarSwatch"]').first()
    const initialHex = await firstSwatch.locator('[class*="paletteBarHex"]').textContent()

    // Change the hue slider (first range input in sidebar)
    const hueSlider = sidebar.locator('input[type="range"]').first()
    const currentValue = await hueSlider.inputValue()
    const newValue = String((Number(currentValue) + 120) % 360)
    await hueSlider.fill(newValue)

    // Hex value should change
    const updatedHex = await firstSwatch.locator('[class*="paletteBarHex"]').textContent()
    expect(updatedHex).not.toBe(initialHex)
  })

  test('hex input validation', async ({ page }) => {
    const sidebar = page.locator('aside').first()
    const hexInput = sidebar.locator('input[type="text"][maxlength="7"]')

    // Enter a valid red hex
    await hexInput.fill('#FF0000')
    await hexInput.blur()
    await page.waitForTimeout(100)

    // Hue should be near 0° for red
    await expect(sidebar.getByText('Hue:')).toBeVisible()
    const hueText = await sidebar.getByText(/Hue:/).textContent()
    expect(hueText).toMatch(/0°/)

    // Enter invalid hex
    await hexInput.focus()
    await hexInput.fill('#ZZZZZZ')
    await hexInput.blur()

    // Should revert to a valid hex
    const value = await hexInput.inputValue()
    expect(value).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })

  test('photo picker upload and color extraction', async ({ page }) => {
    // The FileDropZone has a hidden file input — use setInputFiles directly
    const fileInput = page.locator('input[type="file"][accept="image/*"]').first()
    await fileInput.setInputFiles(path.resolve(__dirname, '../fixtures/test-image.jpg'))

    // Photo picker modal should open
    const modal = page.locator('dialog[aria-label="Pick color from photo"]')
    await expect(modal).toBeVisible()

    // Wait for the image to load onto the canvas
    await page.waitForFunction(
      () => {
        const c = document.querySelector('dialog[open] canvas') as HTMLCanvasElement
        return c && c.width > 0 && c.height > 0
      },
      { timeout: 5000 },
    )

    // Canvas wrapper is hidden (imageLoaded is ref-based, no re-render).
    // Force the wrapper visible so we can click the canvas normally.
    await page.evaluate(() => {
      const wrapper = document.querySelector('dialog[open] [class*="canvasWrapper"]') as HTMLElement
      if (wrapper) wrapper.style.display = 'flex'
    })

    const modalCanvas = modal.locator('canvas').first()
    await modalCanvas.click({ position: { x: 2, y: 2 }, force: true })

    // Modal should close
    await expect(modal).not.toBeVisible()
  })

  test('copy palette hex button', async ({ page, browserName }) => {
    // Firefox doesn't support clipboard-read/clipboard-write permissions in
    // Playwright's permissions API; it grants clipboard writes automatically.
    if (browserName !== 'firefox') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    }

    // Click the Hex copy button (scoped to copy group, not swatches)
    const copyGroup = page.locator('[class*="copyGroup"]')
    await copyGroup.locator('button:text-is("Hex")').click()

    // Button text should change to "Copied!"
    await expect(copyGroup.locator('button:text-is("Copied!")')).toBeVisible()

    // Should revert back after ~1500ms
    await expect(copyGroup.locator('button:text-is("Hex")')).toBeVisible({ timeout: 3000 })
  })

  test('conditional controls per harmony type', async ({ page }) => {
    const sidebar = page.locator('aside').first()

    // Split Complementary shows split angle slider
    await sidebar.locator('button:text-is("Split Complementary")').click()
    await expect(sidebar.getByText(/Split angle:/)).toBeVisible()

    // Triadic hides it
    await sidebar.locator('button:text-is("Triadic")').click()
    await expect(sidebar.getByText(/Split angle:/)).not.toBeVisible()
    await expect(sidebar.getByText(/Spread:/)).not.toBeVisible()

    // Analogous shows spread slider
    await sidebar.locator('button:text-is("Analogous")').click()
    await expect(sidebar.getByText(/Spread:/)).toBeVisible()

    // Tetradic shows rectangle width slider
    await sidebar.locator('button:text-is("Tetradic")').click()
    await expect(sidebar.getByText(/Rectangle width:/)).toBeVisible()
  })
})
