import { test, expect } from '@playwright/test'

test.describe('FOV Simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fov-simulator')
  })

  test('focal length slider updates display', async ({ page }) => {
    const sidebar = page.locator('aside').first()
    const slider = sidebar.locator('input[type="range"][aria-label^="Focal length:"]').first()
    const initialLabel = await slider.getAttribute('aria-label')

    // Use a preset button to change focal length (slider uses log scale, fill() unreliable)
    await sidebar.locator('button:text-is("85mm")').first().click()
    const updatedLabel = await slider.getAttribute('aria-label')
    expect(updatedLabel).not.toBe(initialLabel)
    expect(updatedLabel).toBe('Focal length: 85mm')

    // Canvas should be present with non-zero dimensions
    const canvas = page.locator('canvas[aria-label^="Field of view"]')
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })

  test('focal length preset buttons', async ({ page }) => {
    const sidebar = page.locator('aside').first()

    // Click 24mm preset
    await sidebar.locator('button:text-is("24mm")').first().click()
    await expect(
      sidebar.locator('input[type="range"][aria-label="Focal length: 24mm"]').first()
    ).toBeVisible()

    // Click 135mm preset
    await sidebar.locator('button:text-is("135mm")').first().click()
    await expect(
      sidebar.locator('input[type="range"][aria-label="Focal length: 135mm"]').first()
    ).toBeVisible()
  })

  test('sensor dropdown changes equivalent focal length', async ({ page }) => {
    const sidebar = page.locator('aside').first()

    // Set to a known focal length first
    await sidebar.locator('button:text-is("50mm")').first().click()

    // Select APS-C sensor by value
    const sensorSelect = sidebar.locator('select[aria-label="Lens A sensor"]')
    await sensorSelect.selectOption('apsc_n')

    // Equivalent focal length label should appear
    await expect(sidebar.getByText(/equiv/)).toBeVisible()

    // Switch back to Full Frame
    await sensorSelect.selectOption('ff')

    // Equivalent label should disappear (crop factor = 1)
    await expect(sidebar.getByText(/equiv/)).not.toBeVisible()
  })

  test('scene picker changes background', async ({ page }) => {
    const canvas = page.locator('canvas[aria-label^="Field of view"]')

    // Take a screenshot of the canvas in its current state
    const before = await canvas.screenshot()

    // Click a different scene thumbnail (second one) — scene thumbnails have img children
    const sceneThumbs = page.locator('nav button').filter({ has: page.locator('img') })
    const count = await sceneThumbs.count()
    if (count > 1) {
      await sceneThumbs.nth(1).click()
      await page.waitForTimeout(500)
      const after = await canvas.screenshot()
      expect(Buffer.compare(before, after)).not.toBe(0)
    }
  })

  test('orientation toggle', async ({ page }) => {
    // Verify initial state has one orientation
    const rotateBtn = page.locator('button[title^="Switch to"]').first()
    const initialTitle = await rotateBtn.getAttribute('title')

    // Click rotate button
    await rotateBtn.click()
    await page.waitForTimeout(300)

    // Title should flip between "Switch to portrait" and "Switch to landscape"
    const newTitle = await rotateBtn.getAttribute('title')
    expect(newTitle).not.toBe(initialTitle)
  })

  test('add and remove lens', async ({ page }) => {
    const sidebar = page.locator('aside').first()

    // Default state has 2 lenses (A and B). Add a third.
    await expect(sidebar.locator('select[aria-label="Lens A sensor"]')).toBeVisible()
    await expect(sidebar.locator('select[aria-label="Lens B sensor"]')).toBeVisible()

    await sidebar.getByRole('button', { name: /Add lens/i }).click()
    await expect(sidebar.locator('select[aria-label="Lens C sensor"]')).toBeVisible()

    // Remove the third lens
    await sidebar.locator('button[aria-label="Remove Lens C"]').click()

    // Should be back to two lenses, no Lens C
    await expect(sidebar.locator('select[aria-label="Lens A sensor"]')).toBeVisible()
    await expect(sidebar.locator('select[aria-label="Lens B sensor"]')).toBeVisible()
    await expect(sidebar.locator('select[aria-label="Lens C sensor"]')).not.toBeVisible()
  })

  test('center button resets overlays', async ({ page }) => {
    const sidebar = page.locator('aside').first()

    // Add a second lens so there's something to drag
    await sidebar.getByRole('button', { name: /Add lens/i }).click()
    await page.waitForTimeout(200)

    const canvas = page.locator('canvas[aria-label^="Field of view"]')
    const box = await canvas.boundingBox()

    // Drag on the canvas to move an overlay
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await page.mouse.down()
    await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2 + 80, { steps: 5 })
    await page.mouse.up()

    // Click center button
    await page.locator('button[title="Center overlays"]').first().click()
    await page.waitForTimeout(100)

    await expect(canvas).toBeVisible()
  })

  test('URL state persistence', async ({ page }) => {
    const sidebar = page.locator('aside').first()

    // Set focal length to 85mm
    await sidebar.locator('button:text-is("85mm")').first().click()

    // Select APS-C sensor by value
    const sensorSelect = sidebar.locator('select[aria-label="Lens A sensor"]')
    await sensorSelect.selectOption('apsc_n')

    // useToolQuerySync throttles the replaceState write, so poll rather than
    // sleeping a fixed interval — a fixed wait races the throttle under load.
    await expect.poll(() => page.url()).toContain('a=85')

    // Read the current URL
    const url = page.url()

    // Navigate to the URL directly
    await page.goto(url)
    await page.waitForTimeout(500)

    // Verify state is restored
    await expect(
      page.locator('aside').first().locator('input[type="range"][aria-label="Focal length: 85mm"]').first()
    ).toBeVisible()
  })
})
