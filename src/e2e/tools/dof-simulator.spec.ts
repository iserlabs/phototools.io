import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

const URL = '/en/dof-simulator'

// Every control is mounted twice (desktop `<aside>` sidebar + a mobile
// controls section rendered by the same DofSimulator.tsx) — see CLAUDE.md's
// "duplicate DOM elements" pitfall. Scope all sidebar interactions to the
// desktop instance to avoid strict-mode violations.
const sidebar = (page: Page) => page.locator('aside').first()

// Known-benign console noise, copied from src/e2e/smoke/all-pages.spec.ts so
// this spec's console-clean assertions agree with the house filter.
const BENIGN_CONSOLE =
  /favicon|the server responded with a status of 404|cookieyes|adsense|adsbygoogle|_vercel\/speed-insights|posthog|\/phog\/|connect\.facebook\.net|fbevents\.js|facebook\.com|sentry|monitoring/

/**
 * WebGL canvases render into a browser compositor layer that Playwright's own
 * `locator.screenshot()` has been flaky/hang-prone against on this page (see
 * task brief). The canvas is created with `preserveDrawingBuffer: true`
 * (Task 16), so reading its pixels back via `toDataURL()` inside the page is
 * both faster and doesn't touch Playwright's screenshot pipeline at all.
 */
async function canvasDataUrl(page: Page): Promise<string> {
  return page.locator('canvas').first().evaluate((el) => (el as HTMLCanvasElement).toDataURL())
}

test.describe('DOF Simulator', () => {
  test('loads with viewport canvas and clean console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })
    await page.goto(URL)
    await expect(page.locator('canvas').first()).toBeVisible()
    await page.waitForTimeout(500)
    expect(errors.filter((e) => !BENIGN_CONSOLE.test(e))).toEqual([])
  })

  test('aperture change re-renders the background', async ({ page }) => {
    await page.goto(`${URL}?bg=night-lights&f=1.4`)
    await page.locator('canvas').first().waitFor()
    await page.waitForTimeout(800)
    const wide = await canvasDataUrl(page)

    await page.goto(`${URL}?bg=night-lights&f=16`)
    await page.locator('canvas').first().waitFor()
    await page.waitForTimeout(800)
    const narrow = await canvasDataUrl(page)

    expect(narrow).not.toBe(wide)
  })

  test('model picker swaps the subject', async ({ page }) => {
    await page.goto(URL)
    const sb = sidebar(page)

    // The "Model" picker opener lives in a row whose sibling label reads
    // "Model" (AppearancePanel.tsx) — the button itself only shows the
    // current subject's name and thumbnail, not the word "model".
    await sb.locator('[class*="pickerRow"]', { hasText: 'Model' }).locator('button').click()

    const dialog = sb.locator('dialog[aria-labelledby="dof-model-picker-title"]')
    await expect(dialog).toBeVisible()

    await dialog.locator('[class*="gridItem"]').nth(2).click()
    await expect(dialog).not.toBeVisible()
  })

  test('framing preset drives distance', async ({ page }) => {
    await page.goto(`${URL}?fl=85&d=5`)
    const sb = sidebar(page)
    await sb.getByRole('button', { name: 'Face', exact: true }).click()
    // distanceForFraming(320mm frame height, 85mm FL, 24mm sensor height) = 1.1333m
    await expect(sb.locator('input[type="number"]').first()).toHaveValue(/1\.1/)
  })

  test('lock-FOV holds framing across focal length change', async ({ page }) => {
    await page.goto(`${URL}?fl=85`)
    const sb = sidebar(page)

    await sb.getByRole('button', { name: 'Face', exact: true }).click()
    await sb.locator('input[type="checkbox"]').first().check() // lock FOV

    // The FL slider is log-scaled (logSlider.ts) — its raw `value` is a
    // 0..1000 slider position, not a millimeter value, so `.fill()` with a
    // literal mm number would be wrong. Use the native Home/End keyboard
    // behavior of <input type="range"> to jump to the slider's max (1200mm)
    // instead of trying to replicate the log-scale math here.
    const flSlider = sb.locator('input[type="range"]').first()
    await flSlider.focus()
    await flSlider.press('End')

    // Lock-FOV re-solves distance to hold the Face preset's 320mm frame
    // height at the new (much longer) focal length — the distance grows well
    // past its pre-lock 1.13m value (distanceForFraming(320, 1200, 24) = 16m).
    const d = await sb.locator('input[type="number"]').first().inputValue()
    expect(parseFloat(d)).toBeGreaterThan(2)
  })

  test('A/B wipe divider drags', async ({ page }) => {
    await page.goto(`${URL}?ab=wipe`)
    const divider = page.locator('[role="separator"]').first()
    const layer = page.locator('[class*="dividerLayer"]').first()
    await expect(divider).toBeVisible()

    const before = await divider.getAttribute('aria-valuenow')
    expect(before).toBe('50') // default dividerPos = 0.5

    const layerBox = (await layer.boundingBox())!
    const dividerBox = (await divider.boundingBox())!

    await page.mouse.move(dividerBox.x + dividerBox.width / 2, dividerBox.y + dividerBox.height / 2)
    await page.mouse.down()
    // Drag to 80% of the overlay layer's width — posFromClientX (AbDivider.tsx)
    // computes position as a fraction of the layer, not the 2px divider bar.
    await page.mouse.move(layerBox.x + layerBox.width * 0.8, dividerBox.y + dividerBox.height / 2, { steps: 5 })
    await page.mouse.up()

    const after = await divider.getAttribute('aria-valuenow')
    expect(after).not.toBe(before)
    expect(Number(after)).toBeGreaterThan(65) // clearly moved toward 80%, well past the 50% start
  })

  test('saved settings roundtrip, including reload', async ({ page }) => {
    await page.goto(`${URL}?fl=135&f=1.8`)
    const sb = sidebar(page)

    await sb.locator('button', { hasText: /save settings/i }).click()
    await expect(sb.locator('table tbody tr')).toHaveCount(1)

    await page.reload()
    await expect(sidebar(page).locator('table tbody tr')).toHaveCount(1)

    await sidebar(page).locator('table tbody tr button').last().click() // remove
    await expect(sidebar(page).locator('table tbody tr')).toHaveCount(0)
  })

  test('share URL restores state', async ({ page }) => {
    await page.goto(`${URL}?fl=200&f=4&d=7&orient=portrait&bokeh=blade6`)
    const sb = sidebar(page)
    // The FL slider's raw value is a log-scale position, not 200 — assert the
    // restored value via its aria-label (which always echoes the real mm),
    // rather than the widget's internal 0..1000 coordinate space.
    await expect(sb.locator('input[type="range"]').first()).toHaveAttribute('aria-label', /200mm/)
    await expect(sb.locator('input[type="number"]').first()).toHaveValue('7')
  })

  test('imperial toggle changes distance formatting', async ({ page }) => {
    await page.goto(`${URL}?d=5`)
    const sb = sidebar(page)
    const readout = sb.locator('[class*="readoutRow"]').first()
    const metricText = await readout.textContent()

    await sb.getByRole('button', { name: 'Imperial', exact: true }).click()

    await expect(readout).not.toHaveText(metricText ?? '')
  })

  test('export downloads a PNG', async ({ page }) => {
    await page.goto(URL)
    const exportBtn = page.locator('button', { hasText: /export image/i }).first()
    await expect(exportBtn).toBeEnabled()

    const downloadPromise = page.waitForEvent('download')
    await exportBtn.click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.png$/)
  })

  test('falls back gracefully without WebGL2', async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = new Proxy(original, {
        apply(target, thisArg, args) {
          if (args[0] === 'webgl2') return null
          return Reflect.apply(target, thisArg, args)
        },
      }) as typeof original
    })

    await page.goto(URL)
    await expect(page.locator('img[class*="fallback"]').first()).toBeVisible()
    await expect(sidebar(page).locator('input[type="range"]').first()).toBeEnabled()
  })
})
