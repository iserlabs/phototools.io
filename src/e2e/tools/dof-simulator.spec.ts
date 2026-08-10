import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

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
    const modelRow = sb.locator('[class*="pickerRow"]', { hasText: 'Model' })
    const pickerName = modelRow.locator('[class*="pickerName"]')
    await expect(pickerName).toHaveText('Woman A') // default subject (models.ts DOF_SUBJECTS[0])

    // The rendered subject in the viewport is a stack of plain <img> tags
    // (ModelLayer.tsx, one per depth slice), sourced directly from
    // `/dof/subjects/<id>/...` — unlike the picker's own thumbnail, which
    // goes through next/image's optimizer and never exposes that raw path.
    // This is a durable, independent signal that the subject actually
    // changed on screen, not just that the picker UI says so.
    const subjectImg = page.locator('img[src*="/dof/subjects/"]').first()
    await expect(subjectImg).toHaveAttribute('src', /\/dof\/subjects\/woman-a\//)

    await modelRow.locator('button').click()

    const dialog = sb.locator('dialog[aria-labelledby="dof-model-picker-title"]')
    await expect(dialog).toBeVisible()

    // Grid item index 2 is "Woman B" (models.ts DOF_SUBJECTS order).
    await dialog.locator('[class*="gridItem"]').nth(2).click()
    await expect(dialog).not.toBeVisible()

    // ModelPickerModal.tsx's grid button calls onSelect(subject.id) and
    // onClose() unconditionally in the same click handler — the dialog
    // closing proves nothing about onSelect actually reaching
    // appearance.setSubjectId. Assert the subject genuinely changed, on both
    // the control label and the rendered image, so a broken onSelect wiring
    // fails this test even though the dialog still closes.
    await expect(pickerName).toHaveText('Woman B')
    await expect(subjectImg).toHaveAttribute('src', /\/dof\/subjects\/woman-b\//)
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

    // Read back the FL the slider actually settled on — its aria-label
    // always echoes the real mm value (see "share URL restores state" below)
    // — rather than hardcoding 1200mm, in case log-scale slider quantisation
    // ever lands it a hair off the max. Independently derive the expected
    // held-framing distance from that value via the same formula
    // framingSolver.ts's distanceForFraming implements (frameHeightMm *
    // flMm) / (sensorHMm * 1000): Face preset frame height is 320mm, sensor
    // height is 24mm (full frame, the default, landscape orientation).
    const flLabel = await flSlider.getAttribute('aria-label')
    const flMm = Number(flLabel?.match(/(\d+)mm/)?.[1])
    expect(flMm).toBeGreaterThan(1000) // sanity: End actually jumped near the 1200mm max
    const expectedDistanceM = (320 * flMm) / (24 * 1000)

    // Lock-FOV must have re-solved distance to HOLD the Face preset's 320mm
    // frame height at the new focal length — assert the actual computed
    // value (distanceForFraming(320, 1200, 24) = 16.0m), not merely a loose
    // "> 2" floor that a partially-broken solver could still clear.
    const d = await sb.locator('input[type="number"]').first().inputValue()
    expect(parseFloat(d)).toBeCloseTo(expectedDistanceM, 1)
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
    const row = sb.locator('table tbody tr')
    await expect(row).toHaveCount(1)
    // Assert the persisted VALUES round-tripped, not just that a row exists
    // — SavedSettingsPanel.tsx renders the fl/aperture columns via
    // formatMm/formatAperture as "135mm" / "f/1.8".
    await expect(row).toContainText('135mm')
    await expect(row).toContainText('f/1.8')

    await page.reload()
    const reloadedRow = sidebar(page).locator('table tbody tr')
    await expect(reloadedRow).toHaveCount(1)
    await expect(reloadedRow).toContainText('135mm')
    await expect(reloadedRow).toContainText('f/1.8')

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

    // Confirm the downloaded bytes are an actual PNG, not just a
    // correctly-named empty or garbage file — useImageExport.ts encodes via
    // `canvas.toBlob(resolve, 'image/png')`, so a real export must carry the
    // PNG signature and have real content.
    const filePath = await download.path()
    expect(filePath).not.toBeNull()
    const bytes = readFileSync(filePath!)
    expect(bytes.length).toBeGreaterThan(0)
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
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
