import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

function sidebar(page: Page) {
  return page.locator('[class*="sidebar"]').first()
}

test.describe('Exposure Simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/exposure-simulator')
  })

  test('aperture slider updates display value', async ({ page }) => {
    const panel = sidebar(page)

    // Get the aperture slider (first range input)
    const apertureSlider = panel.locator('input[type="range"]').first()
    const initialValue = await apertureSlider.inputValue()

    // Move aperture slider to index 0 (f/1.4)
    await apertureSlider.fill('0')

    // The label should show f/1.4
    await expect(panel.getByText('f/1.4')).toBeVisible()
    expect(await apertureSlider.inputValue()).not.toBe(initialValue)
  })

  test('shutter speed slider updates display value', async ({ page }) => {
    const panel = sidebar(page)

    // Shutter speed is the second range input
    const shutterSlider = panel.locator('input[type="range"]').nth(1)

    // Move to index 0 (30s — slowest)
    await shutterSlider.fill('0')
    await expect(panel.getByText('30s')).toBeVisible()

    // Move to fastest (index 18 = 1/8000)
    await shutterSlider.fill('18')
    await expect(panel.getByText('1/8000')).toBeVisible()
  })

  test('ISO slider updates display value', async ({ page }) => {
    const panel = sidebar(page)

    // ISO is locked by default — unlock it first by locking aperture instead
    const apertureLockBtn = panel.locator('button[aria-pressed]', { hasText: 'Aperture' }).first()
    await apertureLockBtn.click()

    const isoSlider = panel.locator('input[type="range"]').nth(2)
    await expect(isoSlider).toBeEnabled()

    // Move to highest (index 8 = ISO 25600)
    await isoSlider.fill('8')
    await expect(panel.getByText('25600')).toBeVisible()

    // Move back to low (index 1 = ISO 200)
    await isoSlider.fill('1')
    await expect(panel.getByText('200', { exact: true })).toBeVisible()
  })

  test('exposure value updates when controls change', async ({ page }) => {
    const panel = sidebar(page)

    // Read initial EV
    const evValue = panel.locator('[class*="resultValue"]').first()
    const initial = await evValue.textContent()

    // Change shutter speed (not locked by default) to a very different value
    await panel.locator('input[type="range"]').nth(1).fill('0')
    await page.waitForTimeout(100)

    const updated = await evValue.textContent()
    expect(updated).not.toBe(initial)
  })

  test('lock buttons toggle correctly', async ({ page }) => {
    const panel = sidebar(page)

    // Default lock is ISO
    const isoLockBtn = panel.locator('button[aria-pressed]', { hasText: 'ISO' }).first()
    const apertureLockBtn = panel.locator('button[aria-pressed]', { hasText: 'Aperture' }).first()
    const shutterLockBtn = panel.locator('button[aria-pressed]', { hasText: 'Shutter' }).first()

    await expect(isoLockBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(apertureLockBtn).toHaveAttribute('aria-pressed', 'false')

    // Lock aperture instead
    await apertureLockBtn.click()
    await expect(apertureLockBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(isoLockBtn).toHaveAttribute('aria-pressed', 'false')
    await expect(shutterLockBtn).toHaveAttribute('aria-pressed', 'false')
  })

  test('locked slider is disabled', async ({ page }) => {
    const panel = sidebar(page)

    // Default lock is ISO — ISO slider should be disabled
    const isoSlider = panel.locator('input[type="range"]').nth(2)
    await expect(isoSlider).toBeDisabled()

    // Aperture and shutter sliders should be enabled
    await expect(panel.locator('input[type="range"]').first()).toBeEnabled()
    await expect(panel.locator('input[type="range"]').nth(1)).toBeEnabled()

    // Lock aperture — aperture slider should now be disabled
    const apertureLockBtn = panel.locator('button[aria-pressed]', { hasText: 'Aperture' }).first()
    await apertureLockBtn.click()

    await expect(panel.locator('input[type="range"]').first()).toBeDisabled()
    await expect(isoSlider).toBeEnabled()
  })

  test('effect indicators are displayed', async ({ page }) => {
    const panel = sidebar(page)

    // Should show Depth of Field, Motion, and Noise effect rows
    await expect(panel.getByText('Depth of Field')).toBeVisible()
    await expect(panel.getByText('Motion')).toBeVisible()
    await expect(panel.getByText('Noise')).toBeVisible()
  })

  test('effect labels change with settings', async ({ page }) => {
    const panel = sidebar(page)

    // Set aperture to wide open (f/1.4 — Very Shallow DOF)
    await panel.locator('input[type="range"]').first().fill('0')
    await expect(panel.getByText('Very Shallow')).toBeVisible()

    // Set aperture to narrow (f/22 — Very Deep DOF)
    await panel.locator('input[type="range"]').first().fill('8')
    await expect(panel.getByText('Very Deep')).toBeVisible()
  })

  test('preview renders (WebGL canvas or fallback image)', async ({ page }) => {
    // The preview shows a WebGL canvas when WebGL2 is available, and a
    // fallback <img> if WebGL2 init fails (e.g. headless Firefox on CI
    // without GPU). Either is an acceptable rendered state.
    const canvasMain = page.locator('[class*="canvasMain"]').first()
    await expect(canvasMain).toBeVisible({ timeout: 15000 })

    const canvas = canvasMain.locator('canvas')
    const fallbackImg = canvasMain.locator('img[class*="fallbackImg"]')

    await expect(async () => {
      const canvasVisible = await canvas.isVisible()
      const fallbackVisible = await fallbackImg.isVisible()
      expect(canvasVisible || fallbackVisible).toBe(true)
    }).toPass({ timeout: 15000 })

    // Whichever rendered, it should have nonzero size
    const target = (await canvas.isVisible()) ? canvas : fallbackImg
    const box = await target.boundingBox()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })

  test('scene selector changes preview', async ({ page }) => {
    const canvasMain = page.locator('[class*="canvasMain"]').first()
    await expect(canvasMain).toBeVisible({ timeout: 15000 })

    // Wait for the initial preview (canvas or fallback) to render
    const canvas = canvasMain.locator('canvas')
    const fallbackImg = canvasMain.locator('img[class*="fallbackImg"]')
    await expect(async () => {
      const hasContent =
        (await canvas.isVisible()) || (await fallbackImg.isVisible())
      expect(hasContent).toBe(true)
    }).toPass({ timeout: 15000 })

    // Capture the active scene thumbnail src to compare after selection
    const activeThumb = page.locator('[class*="sceneThumbActive"] img').first()
    const initialSrc = await activeThumb.getAttribute('src')

    // Click a different scene thumbnail (second one)
    const sceneThumbs = page.locator('[class*="sceneThumb"]')
    const count = await sceneThumbs.count()
    if (count > 1) {
      await sceneThumbs.nth(1).click()
      // Wait for the new scene to become the active one (state updated)
      await expect(async () => {
        const newSrc = await page
          .locator('[class*="sceneThumbActive"] img')
          .first()
          .getAttribute('src')
        expect(newSrc).not.toBe(initialSrc)
      }).toPass({ timeout: 15000 })
    }
  })

  test('URL state persistence', async ({ page }) => {
    const panel = sidebar(page)

    // Set aperture to f/2 (index 1), lock to shutter
    await panel.locator('input[type="range"]').first().fill('1')
    await panel.locator('button[aria-pressed]', { hasText: 'Shutter' }).first().click()

    // useToolQuerySync writes a single throttled snapshot of the FULL state,
    // not one write per field. Polling on the first-set param (ai=1) can
    // resolve on an earlier snapshot taken before the second action (the lock
    // click) has landed, so poll on the LAST-set param instead — once it
    // appears, the write is guaranteed to be the full cumulative state.
    await expect.poll(() => page.url()).toContain('lock=shutter')

    const url = page.url()
    expect(url).toContain('ai=1')

    // Navigate to the URL and verify state is restored
    await page.goto(url)
    await page.waitForTimeout(500)

    const restoredPanel = sidebar(page)
    const apertureSlider = restoredPanel.locator('input[type="range"]').first()
    await expect(apertureSlider).toHaveValue('1')

    const shutterLockBtn = restoredPanel.locator('button[aria-pressed]', { hasText: 'Shutter' }).first()
    await expect(shutterLockBtn).toHaveAttribute('aria-pressed', 'true')
  })
})
