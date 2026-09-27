import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE = path.resolve(__dirname, '../fixtures/color-blocks.jpg')

// PhotoPane fits the canvas to its pane via a ResizeObserver; the pane starts
// at a 1x1 placeholder box until that first observation fires. `toBeVisible()`
// passes on the 1x1 box too, so a bare `boundingBox()` right after it is a race
// that intermittently yields a near-zero box and misplaces every click that
// follows. Wait for the box to reach a real size first.
async function photoCanvas(page: Page) {
  const image = page.locator('canvas[class*="image"]')
  await expect(image).toBeVisible()
  await expect.poll(async () => (await image.boundingBox())?.width ?? 0).toBeGreaterThan(50)
  return image
}

test.describe('Color Analyzer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/color-analyzer')
  })

  test('old slug redirects permanently and keeps the query string', async ({ page }) => {
    const res = await page.goto('/color-scheme-generator?h=200&type=triadic')
    expect(page.url()).toMatch(/\/en\/color-analyzer\?h=200&type=triadic$/)
    expect(res?.request().redirectedFrom()).not.toBeNull()
    const sidebar = page.locator('aside').first()
    await expect(sidebar.locator('button:text-is("Triadic")')).toHaveClass(/radioBtnActive/)
  })

  test('no photo: harmony switching changes swatch count', async ({ page }) => {
    const sidebar = page.locator('aside').first()
    const swatches = page.locator('[class*="paletteBarSwatch"]')
    await sidebar.locator('button:text-is("Complementary")').click()
    await expect(swatches).toHaveCount(2)
    await sidebar.locator('button:text-is("Triadic")').click()
    await expect(swatches).toHaveCount(3)
    await sidebar.locator('button:text-is("Tetradic")').click()
    await expect(swatches).toHaveCount(4)
    await sidebar.locator('button:text-is("Monochromatic")').click()
    await expect(swatches).toHaveCount(5)
  })

  test('no photo: hue slider updates swatches', async ({ page }) => {
    const sidebar = page.locator('aside').first()
    const first = page.locator('[class*="paletteBarSwatch"]').first().locator('[class*="paletteBarHex"]')
    const before = await first.textContent()
    const hue = sidebar.locator('input[type="range"]').first()
    await hue.fill(String((Number(await hue.inputValue()) + 120) % 360))
    await expect(first).not.toHaveText(before!)
  })

  test('photo: three samples, harmony guide, nudge lines', async ({ page }) => {
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE)
    const image = await photoCanvas(page)
    const box = (await image.boundingBox())!
    // one click per colour block
    for (const fx of [0.15, 0.5, 0.85]) {
      await image.click({ position: { x: box.width * fx, y: box.height / 2 } })
    }
    await expect(page.locator('[class*="sampleList"] li')).toHaveCount(3)
    await expect(page.getByRole('button', { name: /^Sample 1:/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sample 3:/ })).toBeVisible()

    // Sampled hues are ~0°/143°/227° (not an exact 0/120/240 triadic split — see
    // task-15-report.md). With the default split angle (30°) the closest real
    // fit is split-complementary (mean ~8°) ahead of triadic (mean ~12°).
    await expect(page.getByRole('button', { name: /Closest fit/ })).toContainText('Split Complementary')

    await page.getByRole('tab', { name: 'Harmony guide' }).click()
    const nudges = page.locator('[class*="sampleNudge"]')
    await expect(nudges).toHaveCount(3)
    await page.locator('aside').first().locator('button:text-is("Triadic")').click()
    // Manually forcing Triadic: the anchor sample (h≈0°) lands aligned; the
    // other two (deltas ~23° and ~13°) fall in the "slight" band, not aligned.
    await expect(page.locator('[class*="sampleNudge"][data-band="aligned"]')).toHaveCount(1)
    await expect(page.locator('[class*="sampleNudge"][data-band="slight"]')).toHaveCount(2)
  })

  test('photo: cap at 8 samples', async ({ page }) => {
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE)
    const image = await photoCanvas(page)
    const box = (await image.boundingBox())!
    for (let i = 0; i < 9; i++) {
      await image.click({ position: { x: 20 + i * (box.width - 40) / 9, y: box.height * 0.25 } })
    }
    await expect(page.locator('[class*="sampleList"] li')).toHaveCount(8)
    await expect(page.getByText(/samples max/)).toBeVisible()
  })

  test('mobile: layout stacks and marker drag does not scroll the page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/color-analyzer')
    await page.locator('input[type="file"]').first().setInputFiles(FIXTURE)
    const image = await photoCanvas(page)
    const box = (await image.boundingBox())!
    await image.click({ position: { x: box.width * 0.5, y: box.height * 0.5 } })
    const marker = page.getByRole('button', { name: /^Sample 1:/ })
    const before = await page.evaluate(() => window.scrollY)
    const m = (await marker.boundingBox())!
    await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2)
    await page.mouse.down()
    await page.mouse.move(m.x + 40, m.y + 60, { steps: 5 })
    await page.mouse.up()
    expect(await page.evaluate(() => window.scrollY)).toBe(before)
  })

  test('copy palette hex button', async ({ page, browserName }) => {
    if (browserName !== 'firefox') await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    const copyGroup = page.locator('[class*="copyGroup"]')
    await copyGroup.locator('button:text-is("Hex")').click()
    await expect(copyGroup.locator('button:text-is("Copied!")')).toBeVisible()
  })
})
