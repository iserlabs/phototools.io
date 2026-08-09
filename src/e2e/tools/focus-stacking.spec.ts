import { test, expect } from '@playwright/test'

const URL = '/en/focus-stacking-calculator'

test.describe('Focus Stacking Calculator', () => {
  test('distance mode renders results and shot table', async ({ page }) => {
    await page.goto(URL)
    const sidebar = page.locator('aside, [class*="sidebar"]').first()
    await expect(sidebar.getByText('Shots Required')).toBeVisible()
    const table = page.locator('[class*="tableWrap"]').first()
    await expect(table.locator('tbody tr').first()).toBeVisible()
  })

  test('macro mode via toggle shows rail step and effective aperture', async ({ page }) => {
    await page.goto(URL)
    const sidebar = page.locator('[class*="sidebar"]').first()
    await sidebar.locator('button:text-is("Macro")').click()
    await expect(sidebar.getByText('Rail Step')).toBeVisible()
    await expect(sidebar.getByText('Effective Aperture')).toBeVisible()
    await expect(page).toHaveURL(/mode=macro/)
  })

  test('macro deep link restores state', async ({ page }) => {
    await page.goto(`${URL}?mode=macro&m=2&depth=12`)
    const sidebar = page.locator('[class*="sidebar"]').first()
    await expect(sidebar.getByText('2.00×')).toBeVisible()
  })

  test('infinity toggle switches far limit and updates URL', async ({ page }) => {
    await page.goto(URL)
    const sidebar = page.locator('[class*="sidebar"]').first()
    await sidebar.locator('[class*="infBtn"]').click()
    await expect(page).toHaveURL(/far=inf/)
  })

  test('CSV export downloads a plan', async ({ page }) => {
    await page.goto(URL)
    const sidebar = page.locator('[class*="sidebar"]').first()
    const downloadPromise = page.waitForEvent('download')
    await sidebar.locator('button:text-is("Export as CSV")').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('focus-stack.csv')
  })

  test('JSON export downloads a plan in distance mode', async ({ page }) => {
    await page.goto(URL)
    const sidebar = page.locator('[class*="sidebar"]').first()
    const downloadPromise = page.waitForEvent('download')
    await sidebar.locator('button:text-is("Export as JSON")').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('focus-stack.json')
  })

  test('CSV export downloads a plan in macro mode', async ({ page }) => {
    await page.goto(`${URL}?mode=macro`)
    const sidebar = page.locator('[class*="sidebar"]').first()
    const downloadPromise = page.waitForEvent('download')
    await sidebar.locator('button:text-is("Export as CSV")').click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('macro-stack.csv')
  })

  test('table row hover highlights a diagram band', async ({ page }) => {
    await page.goto(URL)
    const firstRow = page.locator('[class*="tableWrap"] tbody tr').first()
    await firstRow.hover()
    await expect(page.locator('[class*="rowActive"]').first()).toBeVisible()
  })

  // Carried-forward from an earlier task's review: .canvasArea stacks
  // SceneStrip, StackingDiagram, and ShotTable vertically — that layout has
  // never been visually verified. Desktop tool pages must fit within 100vh
  // (no page scroll; only inner panels scroll), so assert both the no-scroll
  // invariant (same comparison the smoke spec uses) and that the stacked
  // layout is genuinely usable: SceneStrip/diagram visible without
  // scrolling, and ShotTable either visible outright or reachable by
  // scrolling .canvasArea (its own internal panel, per the project's "inner
  // panels scroll, the page never does" rule — see FocusStacking.module.css).
  test('desktop canvas column fits without page scroll and shows scene strip, diagram, and shot table', async ({ page }) => {
    await page.goto(URL)

    const sceneStrip = page.locator('[class*="sceneStripWrap"]').first()
    const diagram = page.getByRole('img', { name: 'Focus Stack Diagram' }).first()
    const table = page.locator('[class*="tableWrap"]').first()

    await expect(sceneStrip).toBeVisible()
    await expect(diagram).toBeVisible()
    await expect(table).toBeVisible()

    const innerHeight = await page.evaluate(() => window.innerHeight)

    // SceneStrip and the diagram sit at the top of the stack and must be
    // fully within the viewport with no scrolling at all.
    for (const locator of [sceneStrip, diagram]) {
      const box = await locator.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.y + box!.height).toBeLessThanOrEqual(innerHeight)
    }

    // ShotTable may extend past the fold in the tool's default (12-shot)
    // state — that's fine as long as .canvasArea's own scroll can reach it.
    // scrollIntoViewIfNeeded exercises exactly that: it scrolls the nearest
    // scrollable ancestor (.canvasArea), not the document.
    await table.scrollIntoViewIfNeeded()
    const tableBox = await table.boundingBox()
    expect(tableBox).not.toBeNull()
    expect(tableBox!.y).toBeGreaterThanOrEqual(0)
    expect(tableBox!.y + tableBox!.height).toBeLessThanOrEqual(innerHeight)

    // The page itself must still never scroll — only .canvasArea does.
    const scrolls = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      innerHeight: window.innerHeight,
    }))
    expect(scrolls.scrollHeight).toBeLessThanOrEqual(scrolls.innerHeight)
  })

  // Additional coverage beyond the brief's starting spec: the animate/sweep
  // button. The sweep completes in at most ~4s and then clears the
  // highlight, so this asserts on state shortly after clicking rather than
  // racing the end of the animation.
  test('animate button starts the sweep and swaps to the pause label', async ({ page }) => {
    await page.goto(URL)
    const playButton = page.getByRole('button', { name: 'Animate stack', exact: true })

    // The button must be genuinely clickable at a standard desktop
    // viewport, not merely present in the DOM: confirm the browser's own
    // hit-test agrees that the button — not something painted on top of it,
    // like the Nav bar — is the topmost element at its center point.
    const isTopmost = await playButton.evaluate((el) => {
      const r = el.getBoundingClientRect()
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === el
    })
    expect(isTopmost).toBe(true)

    await playButton.click()

    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await expect(page.locator('[class*="rowActive"]').first()).toBeVisible({ timeout: 2000 })
  })

  // Regression: ShotTable used to call scrollIntoView() on the active row
  // during the play sweep, which scrolls EVERY scrollable ancestor —
  // including .canvasArea (given internal scroll by an earlier task). At the
  // default 1280x720 viewport the canvas stack overflows its slot, so the
  // first sweep tick used to scroll .canvasArea down and push the SceneStrip
  // and diagram off-screen — the very thing "Animate stack" is meant to
  // show. The fix scrolls only the table's own .tableScroll container, so
  // .canvasArea's scrollTop must stay put across the sweep.
  test('starting the play sweep does not scroll the canvas area out of view', async ({ page }) => {
    await page.goto(URL)
    const canvasArea = page.locator('[class*="canvasArea"]').first()

    const before = await canvasArea.evaluate((el) => el.scrollTop)
    await page.getByRole('button', { name: 'Animate stack', exact: true }).click()
    await expect(page.locator('[class*="rowActive"]').first()).toBeVisible({ timeout: 2000 })
    const after = await canvasArea.evaluate((el) => el.scrollTop)

    expect(after).toBe(before)
  })

  // Additional coverage: macro-mode rail step and effective aperture must
  // render real computed numbers, not placeholder text, NaN, or a leaked
  // interpolation literal like "{max}".
  test('macro rail step and effective aperture render real numbers', async ({ page }) => {
    await page.goto(`${URL}?mode=macro`)
    const sidebar = page.locator('[class*="sidebar"]').first()
    const railStepCard = sidebar.locator('[class*="resultCard"]').filter({ hasText: 'Rail Step' })
    const apertureCard = sidebar.locator('[class*="resultCard"]').filter({ hasText: 'Effective Aperture' })

    const railStepValue = (await railStepCard.locator('[class*="resultValue"]').innerText()).trim()
    const apertureValue = (await apertureCard.locator('[class*="resultValue"]').innerText()).trim()

    expect(railStepValue).toMatch(/\d/)
    expect(railStepValue).not.toContain('NaN')
    expect(railStepValue).not.toContain('{max}')

    expect(apertureValue).toMatch(/^f\/\d/)
    expect(apertureValue).not.toContain('NaN')
    expect(apertureValue).not.toContain('{max}')
  })

  // Additional coverage: a diffraction warning must appear for a setting
  // that is actually diffraction-limited. m=2 at the default f/8 gives an
  // effective aperture of f/24, which is past the diffraction-limited
  // threshold for a full-frame sensor's circle of confusion.
  test('diffraction warning appears for a diffraction-limited macro setting', async ({ page }) => {
    await page.goto(`${URL}?mode=macro&m=2&depth=12`)
    const sidebar = page.locator('[class*="sidebar"]').first()
    await expect(sidebar.getByText('acts like f/', { exact: false })).toBeVisible()
  })
})
