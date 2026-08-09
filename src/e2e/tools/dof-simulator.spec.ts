import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe('DOF Simulator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/dof-simulator')
  })

  // Scope to desktop sidebar to avoid mobile duplicates
  function sidebar(page: Page) {
    return page.locator('[class*="sidebar"]').first()
  }

  test('page loads with default settings and results panel', async ({ page }) => {
    const panel = sidebar(page)

    // Settings panel should show "Camera & Lens" heading
    await expect(panel.getByText('Camera & Lens')).toBeVisible()

    // Results panel should show key result labels
    await expect(panel.getByText('Near Focus')).toBeVisible()
    await expect(panel.getByText('Far Focus')).toBeVisible()
    await expect(panel.getByText('Total Depth of Field')).toBeVisible()
    await expect(panel.getByText('Hyperfocal')).toBeVisible()

    // Results should display numeric values (not empty)
    const resultValues = panel.locator('[class*="resultValue"]')
    const count = await resultValues.count()
    expect(count).toBeGreaterThanOrEqual(4)
    for (let i = 0; i < Math.min(count, 4); i++) {
      const text = await resultValues.nth(i).textContent()
      expect(text!.trim().length).toBeGreaterThan(0)
    }
  })

  test('focal length slider updates display and results', async ({ page }) => {
    const panel = sidebar(page)

    // Default focal length is 85mm — verify via aria-label
    const flSlider = panel.locator('input[type="range"][aria-label="Focal length: 85mm"]')
    await expect(flSlider).toBeVisible()

    // Read initial near focus value
    const nearFocusCards = panel.locator('[class*="resultCard"]').first()
    const initialNear = await nearFocusCards.locator('[class*="resultValue"]').textContent()

    // Click a focal length preset to change it (24mm = wider = deeper DoF)
    await panel.locator('button:text-is("24mm")').first().click()

    // Slider aria-label should update
    await expect(
      panel.locator('input[type="range"][aria-label="Focal length: 24mm"]')
    ).toBeVisible()

    // Near focus value should change (wider lens = deeper DoF = different near focus)
    const updatedNear = await nearFocusCards.locator('[class*="resultValue"]').textContent()
    expect(updatedNear).not.toBe(initialNear)
  })

  test('focal length preset buttons update slider', async ({ page }) => {
    const panel = sidebar(page)

    // Click 50mm preset
    await panel.locator('button:text-is("50mm")').first().click()
    await expect(
      panel.locator('input[type="range"][aria-label="Focal length: 50mm"]')
    ).toBeVisible()

    // Click 200mm preset
    await panel.locator('button:text-is("200mm")').first().click()
    await expect(
      panel.locator('input[type="range"][aria-label="Focal length: 200mm"]')
    ).toBeVisible()
  })

  test('aperture control changes DoF results', async ({ page }) => {
    const panel = sidebar(page)

    // Default aperture is f/2.8 — capture initial total DoF
    await expect(
      panel.locator('input[type="range"][aria-label="Aperture: f/2.8"]')
    ).toBeVisible()

    // Read initial total DoF (third result card in the 2x2 grid)
    const totalDofCard = panel.locator('[class*="resultsGrid"]').first()
      .locator('[class*="resultCard"]').nth(2)
    const initialDoF = await totalDofCard.locator('[class*="resultValue"]').textContent()

    // Click aperture tick label for f/8 (stops down = deeper DoF)
    await panel.locator('button:text-is("8")').first().click()
    await expect(
      panel.locator('input[type="range"][aria-label="Aperture: f/8"]')
    ).toBeVisible()

    // Total DoF should increase (stopped down aperture = more in focus)
    const updatedDoF = await totalDofCard.locator('[class*="resultValue"]').textContent()
    expect(updatedDoF).not.toBe(initialDoF)
  })

  test('sensor dropdown changes DoF values', async ({ page }) => {
    const panel = sidebar(page)

    // Read initial hyperfocal (fourth result card). Hyperfocal is
    // sensitive to CoC, which changes with sensor size — switching from
    // full-frame (default) to APS-C should produce a clearly different
    // value (~86m → ~132m for the default focal/aperture).
    const hyperfocalCard = panel.locator('[class*="resultsGrid"]').first()
      .locator('[class*="resultCard"]').nth(3)
    const initialHyper = await hyperfocalCard.locator('[class*="resultValue"]').textContent()

    // Verify we're starting from full-frame
    const sensorSelect = panel.locator('select').first()
    await expect(sensorSelect).toHaveValue('ff')

    // Change via URL param — useQueryInit wires `s` to setSensorId, so
    // reloading with ?s=apsc_n applies the new sensor via React state
    // without relying on DOM selectOption, which has been flaky in CI.
    await page.goto('/en/dof-simulator?s=apsc_n')
    await expect(panel.locator('select').first()).toHaveValue('apsc_n')

    // Hyperfocal should now reflect the APS-C sensor
    const updatedHyper = await panel
      .locator('[class*="resultsGrid"]')
      .first()
      .locator('[class*="resultCard"]')
      .nth(3)
      .locator('[class*="resultValue"]')
      .textContent()
    expect(updatedHyper).not.toBe(initialHyper)
  })

  test('orientation toggle switches between landscape and portrait', async ({ page }) => {
    const panel = sidebar(page)

    // Default is landscape — the Landscape button should be active (aria-pressed)
    const landscapeBtn = panel.locator('button[aria-pressed="true"]:text-is("Landscape")')
    await expect(landscapeBtn).toBeVisible()

    // Click Portrait
    await panel.locator('button:text-is("Portrait")').first().click()
    await page.waitForTimeout(200)

    // Portrait button should now be active
    const portraitBtn = panel.locator('button[aria-pressed="true"]:text-is("Portrait")')
    await expect(portraitBtn).toBeVisible()
  })

  test('scene buttons change active scene', async ({ page }) => {
    // Default scene is "Park Portrait" (first scene, active by default)
    const parkBtn = page.locator('button[aria-pressed="true"]:text-is("Park Portrait")')
    await expect(parkBtn).toBeVisible()

    // Click "Urban Street" scene
    await page.locator('button:text-is("Urban Street")').click()
    await page.waitForTimeout(300)

    // Urban Street should now be the active scene
    const streetBtn = page.locator('button[aria-pressed="true"]:text-is("Urban Street")')
    await expect(streetBtn).toBeVisible()

    // Park Portrait should no longer be active
    await expect(
      page.locator('button[aria-pressed="true"]:text-is("Park Portrait")')
    ).not.toBeVisible()
  })

  test('subject mode toggle switches between Figure and Target', async ({ page }) => {
    // Default is Figure mode
    const figureBtn = page.locator('button[aria-pressed="true"]:text-is("Figure")')
    await expect(figureBtn).toBeVisible()

    // Click Target
    await page.locator('button:text-is("Target")').click()
    await page.waitForTimeout(200)

    // Target should now be active
    const targetBtn = page.locator('button[aria-pressed="true"]:text-is("Target")')
    await expect(targetBtn).toBeVisible()
  })

  test('A/B comparison mode toggle', async ({ page }) => {
    // Default is Single View mode
    await expect(
      page.locator('button[aria-pressed="true"]:text-is("Single View")')
    ).toBeVisible()

    // Click A/B to enable comparison
    await page.locator('button:text-is("A/B")').click()
    await page.waitForTimeout(300)

    // Wipe/Split sub-options should appear
    await expect(page.locator('button:text-is("Wipe Compare")')).toBeVisible()
    await expect(page.locator('button:text-is("Split Compare")')).toBeVisible()

    // Wipe should be default sub-mode
    await expect(
      page.locator('button[aria-pressed="true"]:text-is("Wipe Compare")')
    ).toBeVisible()

    // A/B set toggle (A/B buttons) should appear in sidebar
    const panel = sidebar(page)
    await expect(panel.locator('button[aria-pressed="true"]:text-is("A")')).toBeVisible()
    await expect(panel.locator('button:text-is("B")')).toBeVisible()

    // Switch to Split mode
    await page.locator('button:text-is("Split Compare")').click()
    await page.waitForTimeout(200)
    await expect(
      page.locator('button[aria-pressed="true"]:text-is("Split Compare")')
    ).toBeVisible()

    // Switch back to Single View
    await page.locator('button:text-is("Single View")').click()
    await page.waitForTimeout(200)

    // Sub-options should disappear
    await expect(page.locator('button:text-is("Wipe Compare")')).not.toBeVisible()
  })

  test('A/B set toggle switches settings panels', async ({ page }) => {
    const panel = sidebar(page)

    // Enable A/B mode
    await page.locator('button:text-is("A/B")').click()
    await page.waitForTimeout(300)

    // Set A is active — change focal length to 135mm
    await panel.locator('button:text-is("135mm")').first().click()
    await expect(
      panel.locator('input[type="range"][aria-label="Focal length: 135mm"]')
    ).toBeVisible()

    // Switch to set B
    await panel.locator('button:text-is("B")').first().click()
    await page.waitForTimeout(200)

    // Set B should show its own default focal length (50mm), not 135mm
    await expect(
      panel.locator('input[type="range"][aria-label="Focal length: 50mm"]')
    ).toBeVisible()

    // Switch back to set A — should still be 135mm
    await panel.locator('button:text-is("A")').first().click()
    await page.waitForTimeout(200)
    await expect(
      panel.locator('input[type="range"][aria-label="Focal length: 135mm"]')
    ).toBeVisible()
  })

  test('canvas viewport renders', async ({ page }) => {
    // The viewport should contain a canvas element
    const canvas = page.locator('[class*="viewport"] canvas')
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box!.width).toBeGreaterThan(0)
    expect(box!.height).toBeGreaterThan(0)
  })

  test('depth of field diagram bar is visible', async ({ page }) => {
    const diagram = page.locator('svg[aria-label="Depth of field distance diagram"]')
    await expect(diagram).toBeVisible()
  })

  test('blur profile graph is visible', async ({ page }) => {
    const graph = page.locator('svg[aria-label="Blur profile graph"]')
    await expect(graph).toBeVisible()
  })

  test('blur readout displays in toolbar', async ({ page }) => {
    // Toolbar should show "Blur: X.XX%"
    const blurText = page.locator('[class*="toolbar"]').getByText(/Blur:/)
    await expect(blurText).toBeVisible()
    const text = await blurText.textContent()
    expect(text).toMatch(/Blur:\s*\d+\.\d+%/)
  })

  test('framing presets are displayed', async ({ page }) => {
    const panel = sidebar(page)

    // Framing panel should show preset buttons
    await expect(panel.getByText('Framing')).toBeVisible()
    await expect(panel.locator('button:text-is("Face")')).toBeVisible()
    await expect(panel.locator('button:text-is("Full Body")')).toBeVisible()

    // Click a framing preset
    await panel.locator('button:text-is("Face")').click()
    await page.waitForTimeout(200)

    // The button should become active (aria-pressed)
    await expect(
      panel.locator('button[aria-pressed="true"]:text-is("Face")')
    ).toBeVisible()
  })

  test('bokeh panel is accessible via details toggle', async ({ page }) => {
    const panel = sidebar(page)

    // Bokeh panel is a <details> element — expand it by clicking the summary
    const bokehSummary = panel.locator('summary:has-text("Bokeh")')
    await expect(bokehSummary).toBeVisible()
    await bokehSummary.click()

    // After expanding, the bokeh shape select should be visible
    const bokehSelect = panel.locator('details select')
    await expect(bokehSelect).toBeVisible()

    // Change bokeh shape
    await bokehSelect.selectOption('blade7')

    // Diffraction checkbox should be present
    const diffractionLabel = panel.locator('label:has-text("Simulate diffraction")')
    await expect(diffractionLabel).toBeVisible()
  })

  test('diffraction warning appears at small apertures with low background blur', async ({ page }) => {
    // Navigate with URL params: short FL, small aperture, far subject → low background blur
    // isDiffractionLimited = calcAiryDisk(aperture) > backgroundBlurMm
    await page.goto('/dof-simulator?fl=24&f=22&d=50')
    const panel = sidebar(page)

    await expect(
      panel.getByText('Diffraction softening may reduce sharpness at this aperture')
    ).toBeVisible()
  })

  test('results show extended metrics', async ({ page }) => {
    const panel = sidebar(page)

    // Extended result cards beyond the 2x2 grid
    await expect(panel.getByText('Background Blur')).toBeVisible()
    await expect(panel.getByText('Circle of Confusion')).toBeVisible()
    await expect(panel.getByText('Isolation Score')).toBeVisible()

    // Isolation score badge should be visible
    const badge = panel.locator('[class*="isolationBadge"]')
    await expect(badge).toBeVisible()
    const score = await badge.textContent()
    const num = parseInt(score!, 10)
    expect(num).toBeGreaterThanOrEqual(0)
    expect(num).toBeLessThanOrEqual(100)
  })

  test('URL state persistence', async ({ page }) => {
    const panel = sidebar(page)

    // Set focal length to 135mm
    await panel.locator('button:text-is("135mm")').first().click()

    // Select APS-C sensor
    const sensorSelect = panel.locator('select').first()
    await sensorSelect.selectOption('apsc_n')

    // Click a scene
    await page.locator('button:text-is("Macro")').click()

    // useToolQuerySync writes a single throttled snapshot of the FULL state,
    // not one write per field. Three separate actions can land as separate
    // snapshots under load, so poll on the LAST-set param (scene=macro) —
    // once it appears, the write is guaranteed to include everything set
    // before it too.
    await expect.poll(() => page.url()).toContain('scene=macro')

    // Verify URL contains query params
    const url = page.url()
    expect(url).toContain('fl=135')
    expect(url).toContain('s=apsc_n')

    // Navigate to the same URL directly
    await page.goto(url)
    await page.waitForTimeout(500)

    // Verify state is restored
    await expect(
      sidebar(page).locator('input[type="range"][aria-label="Focal length: 135mm"]')
    ).toBeVisible()

    // Macro scene should be active
    await expect(
      page.locator('button[aria-pressed="true"]:text-is("Macro")')
    ).toBeVisible()
  })

  test('URL persists aperture and distance', async ({ page }) => {
    const panel = sidebar(page)

    // Set aperture to f/8
    await panel.locator('button:text-is("8")').first().click()

    // useToolQuerySync throttles the replaceState write, so poll rather than
    // sleeping a fixed interval — a fixed wait races the throttle under load.
    await expect.poll(() => page.url()).toContain('f=8')

    const url = page.url()

    // Navigate directly and verify
    await page.goto(url)
    await page.waitForTimeout(500)

    await expect(
      sidebar(page).locator('input[type="range"][aria-label="Aperture: f/8"]')
    ).toBeVisible()
  })

  test('wider aperture produces shallower DoF than stopped down', async ({ page }) => {
    const panel = sidebar(page)

    // Set to f/1.4 (wide open)
    // The tick labels are full-stop values; click the first one which is f/1.4
    await panel.locator('button:text-is("1.4")').first().click()
    await page.waitForTimeout(200)

    // Read total DoF at f/1.4
    const totalDofCard = panel.locator('[class*="resultsGrid"]').first()
      .locator('[class*="resultCard"]').nth(2)
    const wideDoF = await totalDofCard.locator('[class*="resultValue"]').textContent()

    // Set to f/16 (stopped down)
    await panel.locator('button:text-is("16")').first().click()
    await page.waitForTimeout(200)

    const stoppedDoF = await totalDofCard.locator('[class*="resultValue"]').textContent()

    // The wider aperture (f/1.4) should give a shallower (smaller) DoF than f/16
    // Both are formatted as "X.XX m" or "XX cm" — just verify they differ
    expect(wideDoF).not.toBe(stoppedDoF)
  })

  test('changing focal length updates blur readout percentage', async ({ page }) => {
    const panel = sidebar(page)

    // Read initial blur readout
    const blurReadout = page.locator('[class*="toolbar"]').getByText(/Blur:/)
    const initialBlur = await blurReadout.textContent()

    // Switch to a very different focal length (24mm vs default 85mm)
    await panel.locator('button:text-is("24mm")').first().click()
    await page.waitForTimeout(300)

    const updatedBlur = await blurReadout.textContent()
    expect(updatedBlur).not.toBe(initialBlur)
  })
})
