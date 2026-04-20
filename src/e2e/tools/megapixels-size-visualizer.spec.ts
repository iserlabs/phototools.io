import { test, expect } from '@playwright/test'

const URL = '/en/megapixels-size-visualizer'

test.describe('Megapixels Size Visualizer', () => {
  test('page renders without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto(URL)
    await expect(page.locator('h1')).toBeAttached()
    await expect(page.locator('h2').first()).toBeVisible()

    const critical = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('cookieyes') &&
      !e.includes('adsbygoogle') &&
      !e.includes('googlesyndication') &&
      !e.includes('googleads') &&
      !e.includes('_vercel/speed-insights'),
    )
    expect(critical).toEqual([])
  })

  test('default mode is overlay and canvas is present', async ({ page }) => {
    await page.goto(URL)
    const canvas = page.locator('canvas[role="img"]').first()
    await expect(canvas).toBeVisible()
  })

  test('toggling an MP updates the URL', async ({ page }) => {
    await page.goto(URL)
    const checkbox = page.locator('[data-testid="mp-toggle-mp_45"]').first()
    await expect(checkbox).toBeChecked()
    // The native input is display:none with a styled label sibling; click the enclosing label.
    await checkbox.locator('xpath=ancestor::label').first().click()
    await expect(checkbox).not.toBeChecked()
    await expect(page).toHaveURL(/show=/)
  })

  test('adding a custom MP persists it in the checkbox list', async ({ page }) => {
    await page.goto(URL)
    await page.locator('[data-testid="custom-mp-value"]').first().fill('75')
    await page.locator('[data-testid="custom-mp-add"]').first().click()
    await expect(page.getByText(/75 MP/).first()).toBeVisible()
  })
})
