import type { Page, Locator } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe('Sensor Size Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sensor-size-comparison')
  })

  // Scope to the desktop controls panel to avoid the duplicated mobile copy.
  // NOTE: this tool's sidebar is a plain <div class="sidebar">, NOT an
  // <aside> — the only <aside> on this page is the LearnPanel. Selectors
  // must target `[class*="sidebar"]`, not the `aside` role/tag.
  function sidebar(page: Page) {
    return page.locator('[class*="sidebar"]').first()
  }

  function canvas(page: Page) {
    return page.locator('canvas[aria-label^="Sensor size comparison"]')
  }

  // Group headers carry `aria-expanded`; quick-compare preset buttons (one
  // of which is literally labeled "Film vs Digital") carry `aria-pressed`
  // instead and never declare `aria-expanded`. Filtering on `expanded`
  // narrows `getByRole` to only the group header even for a loose /film/i
  // or /cine/i name match — this is the fix for the known trap where an
  // earlier task's unanchored /film/i regex hit both the group header and
  // the "Film vs Digital" preset button.
  function groupHeader(scope: Locator, name: RegExp, expanded: boolean) {
    return scope.getByRole('button', { name, expanded })
  }

  /**
   * Sensor rects in overlay mode are all centered on the same point, so a
   * single click/hover anywhere inside any rendered rect is a valid hit —
   * we don't need to reverse-engineer the exact draw-layout math (padding,
   * label-column width, scale) to find one. Instead we grid-search the
   * canvas's own bounding box and use the app's live hover feedback (a
   * table row gaining the `rowHovered` class) as ground truth for "did we
   * land inside a rect". This stays correct even if `drawOverlay`'s layout
   * constants change later.
   */
  async function findSensorRectPoint(page: Page, canvasLocator: Locator): Promise<{ x: number; y: number }> {
    const box = await canvasLocator.boundingBox()
    if (!box) throw new Error('sensor canvas has no bounding box')
    const hoveredRow = page.locator('tr[class*="rowHovered"]')
    const steps = 14
    for (let i = 1; i < steps; i++) {
      for (let j = 1; j < steps; j++) {
        const x = box.x + (box.width * i) / steps
        const y = box.y + (box.height * j) / steps
        await page.mouse.move(x, y)
        if ((await hoveredRow.count()) > 0) return { x, y }
      }
    }
    throw new Error('grid search over the canvas never highlighted a table row — overlay hit-testing may be broken')
  }

  test('sensor checkbox toggles', async ({ page }) => {
    const c = canvas(page)
    await expect(c).toBeVisible()

    // "Full Frame" (ff) is in the ff-aps group, which is open by default —
    // no group expansion needed to reach it.
    const panel = sidebar(page)
    const ffLabel = panel.locator('label').filter({ hasText: 'Full Frame' }).first()
    await expect(ffLabel).toBeVisible()

    const before = await c.screenshot()

    await ffLabel.click()
    await page.waitForTimeout(400)

    const afterUncheck = await c.screenshot()
    expect(Buffer.compare(before, afterUncheck)).not.toBe(0)

    await ffLabel.click()
    await page.waitForTimeout(400)

    const afterRecheck = await c.screenshot()
    expect(Buffer.compare(afterUncheck, afterRecheck)).not.toBe(0)
  })

  test('mode toggle changes rendering', async ({ page }) => {
    const c = canvas(page)

    await expect(c).toHaveAttribute('aria-label', /overlay/)

    await sidebar(page).getByRole('button', { name: 'Side by Side' }).click()
    await expect(c).toHaveAttribute('aria-label', /side-by-side/)

    await sidebar(page).getByRole('button', { name: 'Pixel Density' }).click()
    await expect(c).toHaveAttribute('aria-label', /pixel-density/)
  })

  test('custom sensor — add', async ({ page }) => {
    const panel = sidebar(page)

    await panel.getByPlaceholder('Name').fill('Custom Test')
    await panel.getByPlaceholder('W (mm)').fill('30')
    await panel.getByPlaceholder('H (mm)').fill('20')
    await panel.getByPlaceholder('Megapixels (optional)').fill('24')

    await panel.getByRole('button', { name: 'Add Sensor' }).click()

    await expect(panel.getByText('Custom Test')).toBeVisible()
    await expect(canvas(page)).toBeVisible()
  })

  test('custom sensor — edit', async ({ page }) => {
    const panel = sidebar(page)

    await panel.getByPlaceholder('Name').fill('Edit Me')
    await panel.getByPlaceholder('W (mm)').fill('30')
    await panel.getByPlaceholder('H (mm)').fill('20')
    await panel.getByRole('button', { name: 'Add Sensor' }).click()
    await expect(panel.getByText('Edit Me')).toBeVisible()

    await panel.getByRole('button', { name: '✎' }).click()

    const editForm = panel.locator('[class*="editForm"]')
    await expect(editForm).toBeVisible()
    await editForm.getByPlaceholder('W (mm)').fill('40')

    await editForm.getByRole('button', { name: 'Save' }).click()

    await expect(panel.getByText('Edit Me')).toBeVisible()
  })

  test('custom sensor — delete', async ({ page }) => {
    const panel = sidebar(page)

    await panel.getByPlaceholder('Name').fill('Delete Me')
    await panel.getByPlaceholder('W (mm)').fill('30')
    await panel.getByPlaceholder('H (mm)').fill('20')
    await panel.getByRole('button', { name: 'Add Sensor' }).click()
    await expect(panel.getByText('Delete Me')).toBeVisible()

    await panel.getByRole('button', { name: '✕' }).click()

    await expect(panel.getByText('Delete Me')).not.toBeVisible()
  })

  test('URL state persistence', async ({ page }) => {
    await sidebar(page).getByRole('button', { name: 'Side by Side' }).click()
    await expect(page).toHaveURL(/mode=side-by-side/)

    const url = page.url()
    await page.goto(url)

    await expect(canvas(page)).toHaveAttribute('aria-label', /side-by-side/)
  })

  test('localStorage persistence for custom sensors', async ({ page }) => {
    const panel = sidebar(page)

    await panel.getByPlaceholder('Name').fill('Persist Me')
    await panel.getByPlaceholder('W (mm)').fill('25')
    await panel.getByPlaceholder('H (mm)').fill('18')
    await panel.getByRole('button', { name: 'Add Sensor' }).click()
    await expect(panel.getByText('Persist Me')).toBeVisible()

    const stored = await page.evaluate(() => localStorage.getItem('phototools:custom-sensors'))
    expect(stored).toContain('Persist Me')

    await page.reload()

    await expect(sidebar(page).getByText('Persist Me')).toBeVisible()
  })

  test('film group expands and the pixel-density exclusion note appears', async ({ page }) => {
    const panel = sidebar(page)

    // film starts collapsed. The checkbox <input> is deliberately
    // `display: none` (custom checkbox UI, see SensorSize.module.css
    // `.checkLabel input`) — click the label, not the hidden input.
    await groupHeader(panel, /film/i, false).click()
    await panel.locator('label', { hasText: '6×7 Film' }).click()

    await panel.getByRole('button', { name: 'Pixel Density' }).click()
    await expect(panel.getByText(/no defined pixel count/i)).toBeVisible()
  })

  test('cine_s16 selection also triggers the pixel-density exclusion note', async ({ page }) => {
    const panel = sidebar(page)

    // cine starts collapsed
    await groupHeader(panel, /cinema/i, false).click()
    await panel.locator('label', { hasText: 'Super 16' }).click()

    await panel.getByRole('button', { name: 'Pixel Density' }).click()
    await expect(panel.getByText(/no defined pixel count/i)).toBeVisible()
  })

  test('film sensor selection round-trips through the show= URL param and auto-expands its group', async ({ page }) => {
    const panel = sidebar(page)

    await groupHeader(panel, /film/i, false).click()
    await panel.locator('label', { hasText: '6×7 Film' }).click()
    await expect(page).toHaveURL(/show=[^&]*film_6x7/)

    const url = page.url()
    await page.goto(url)

    const freshPanel = sidebar(page)
    const label = freshPanel.locator('label', { hasText: '6×7 Film' })
    await expect(label.locator('input')).toBeChecked()
    // A visible sensor inside the (otherwise collapsed-by-default) film
    // group must force it open on load.
    await expect(groupHeader(freshPanel, /film/i, true)).toBeVisible()
  })

  test('quick-compare preset replaces the selection, updates aria-pressed, and updates the URL', async ({ page }) => {
    const panel = sidebar(page)
    const presetBtn = panel.getByRole('button', { name: 'Crop vs Full Frame', exact: true })

    await expect(presetBtn).toHaveAttribute('aria-pressed', 'false')
    await presetBtn.click()

    // `URLSearchParams.set()` percent-encodes `+` as `%2B` in the address
    // bar (it round-trips fine on read via `.get()`, which decodes it back
    // to a literal `+`) — the raw URL string is never a literal `+`.
    await expect(page).toHaveURL(/show=ff%2Bapsc_n%2Bapsc_c%2Bm43/)
    await expect(presetBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('row expands from its own toggle button (desktop table)', async ({ page }) => {
    const row = page.locator('[id="sensor-row-desktop-ff"]')
    await row.getByRole('button').click()

    const detail = page.locator('[id="sensor-detail-desktop-ff"]')
    await expect(detail.getByText('Reference sensor (full frame)')).toBeVisible()
  })

  test('row expansion is an accordion — opening a second row closes the first', async ({ page }) => {
    await page.locator('[id="sensor-row-desktop-ff"]').getByRole('button').click()
    await expect(page.locator('[id="sensor-detail-desktop-ff"]')).toBeVisible()

    await page.locator('[id="sensor-row-desktop-mf"]').getByRole('button').click()
    await expect(page.locator('[id="sensor-detail-desktop-mf"]')).toBeVisible()
    // Accordion: the detail <tr> is conditionally rendered, not just hidden.
    await expect(page.locator('[id="sensor-detail-desktop-ff"]')).toHaveCount(0)
  })

  test('hovering a canvas sensor rect highlights the matching table row and redraws the tooltip', async ({ page }) => {
    const c = canvas(page)
    await expect(c).toBeVisible()

    const before = await c.screenshot()
    const point = await findSensorRectPoint(page, c)
    await page.mouse.move(point.x, point.y)

    const hoveredRow = page.locator('tr[class*="rowHovered"]').first()
    await expect(hoveredRow).toBeVisible()

    const after = await c.screenshot()
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('hovering a table row redraws the canvas (bidirectional sync)', async ({ page }) => {
    const c = canvas(page)
    await expect(c).toBeVisible()
    const before = await c.screenshot()

    await page.locator('[id="sensor-row-desktop-ff"]').hover()
    await page.waitForTimeout(400)

    const after = await c.screenshot()
    expect(Buffer.compare(before, after)).not.toBe(0)
  })

  test('theme toggle triggers a canvas redraw in both light and dark', async ({ page }) => {
    const c = canvas(page)
    await expect(c).toBeVisible()
    const html = page.locator('html')

    const themeToggle = page.getByRole('button', { name: /switch to (light|dark) mode/i })

    const shot1 = await c.screenshot()
    await themeToggle.click()
    await expect(html).toHaveAttribute('data-theme', /light|dark/)
    const themeAfterFirstToggle = await html.getAttribute('data-theme')
    await page.waitForTimeout(400)
    const shot2 = await c.screenshot()
    expect(Buffer.compare(shot1, shot2)).not.toBe(0)

    await themeToggle.click()
    await expect(html).not.toHaveAttribute('data-theme', themeAfterFirstToggle!)
    await page.waitForTimeout(400)
    const shot3 = await c.screenshot()
    expect(Buffer.compare(shot2, shot3)).not.toBe(0)
  })

  test('canvas click expands the matching row at a ~1200px (desktop) viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 })
    const c = canvas(page)
    await expect(c).toBeVisible()

    const point = await findSensorRectPoint(page, c)
    await page.mouse.click(point.x, point.y)

    const expandedButton = page.locator('[id^="sensor-row-desktop-"] button[aria-expanded="true"]')
    await expect(expandedButton).toHaveCount(1)
    const detailId = await expandedButton.getAttribute('aria-controls')
    await expect(page.locator(`[id="${detailId}"]`)).toBeVisible()
  })

  test('canvas click expands the matching row at a ~800px (mobile) viewport', async ({ page }) => {
    // Previously a dead zone: the pre-restructure table used unscoped ids,
    // so a canvas click at this width either scrolled to nothing or hit a
    // duplicate id. Row ids are now variant-scoped (`sensor-row-mobile-*`),
    // and clicking must expand the mobile copy of the table specifically.
    await page.setViewportSize({ width: 800, height: 900 })
    const c = canvas(page)
    await expect(c).toBeVisible()

    const point = await findSensorRectPoint(page, c)
    await page.mouse.click(point.x, point.y)

    const expandedMobileButton = page.locator('[id^="sensor-row-mobile-"] button[aria-expanded="true"]')
    await expect(expandedMobileButton).toHaveCount(1)
    const detailId = await expandedMobileButton.getAttribute('aria-controls')
    await expect(page.locator(`[id="${detailId}"]`)).toBeVisible()

    // The desktop copy of the same row is also technically "expanded" (the
    // expandedId state is shared across both SensorTable instances), but
    // its ancestor is display:none below the 1024px breakpoint.
    const expandedDesktopButtons = page.locator('[id^="sensor-row-desktop-"] button[aria-expanded="true"]')
    await expect(expandedDesktopButtons).toHaveCount(1)
    const desktopDetailId = await expandedDesktopButtons.getAttribute('aria-controls')
    await expect(page.locator(`[id="${desktopDetailId}"]`)).not.toBeVisible()
  })

  test('compare drawer opens from an expanded row and round-trips through ?vs=', async ({ page }) => {
    await page.goto('/en/sensor-size-comparison')
    await page.locator('[id="sensor-row-desktop-ff"] button').first().click()
    await page.locator('[id="sensor-detail-desktop-ff"] select').selectOption('apsc_n')
    await expect(page.getByTestId('compare-verdict')).toBeVisible()
    await expect(page).toHaveURL(/vs=ff%2Capsc_n/)

    await page.reload()
    await expect(page.getByTestId('compare-verdict')).toBeVisible()
  })

  test('closing the drawer drops ?vs= without changing the selection', async ({ page }) => {
    await page.goto('/en/sensor-size-comparison?vs=ff,apsc_n')
    await expect(page.getByTestId('compare-verdict')).toBeVisible()
    const before = await page.locator('[id^="sensor-row-desktop-"]').count()
    await page.getByRole('button', { name: /close comparison/i }).click()
    await expect(page.getByTestId('compare-verdict')).toHaveCount(0)
    await expect(page).not.toHaveURL(/vs=/)
    expect(await page.locator('[id^="sensor-row-desktop-"]').count()).toBe(before)
  })

  test('an invalid ?vs= is ignored and dropped', async ({ page }) => {
    await page.goto('/en/sensor-size-comparison?vs=ff,not_a_sensor')
    await expect(page.getByTestId('compare-verdict')).toHaveCount(0)
    await expect(page).not.toHaveURL(/vs=/)
  })

  test('compare drawer opens from "Compare these two" when exactly two sensors are selected, and only one verdict mounts', async ({ page }) => {
    await page.goto('/en/sensor-size-comparison')
    const panel = sidebar(page)

    // Default visible set is 5 sensors (mf, ff, apsc_n, m43, phone) whose
    // groups are all already expanded (a group auto-opens the moment one of
    // its members is visible, and never auto-collapses). Uncheck three,
    // leaving exactly ff + apsc_n, so the "Compare these two" button (entry
    // point b) appears.
    await panel.locator('label').filter({ hasText: 'Medium Format (44x33)' }).click()
    await panel.locator('label').filter({ hasText: 'Micro Four Thirds' }).click()
    await panel.locator('label').filter({ hasText: 'Smartphone Flagship' }).click()

    // "Compare these two" renders twice (once for the desktop layout, once
    // for the mobile layout) — the mobile copy's ancestor is display:none
    // above the 1024px breakpoint, so scope to the desktop-visible one.
    const compareBtn = page.locator('[class*="desktopOnly"]').getByRole('button', { name: 'Compare these two' })
    await expect(compareBtn).toBeVisible()
    await compareBtn.click()

    // Only one CompareDrawer is ever mounted (gated by isDesktop, not CSS) —
    // toHaveCount(1) proves that, not just toBeVisible().
    await expect(page.getByTestId('compare-verdict')).toHaveCount(1)
    await expect(page).toHaveURL(/vs=ff%2Capsc_n/)
  })
})
