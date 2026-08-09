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
  // invariant (same comparison the smoke spec uses) and that all three
  // pieces of the stacked layout are genuinely within the viewport bounds
  // (not merely CSS-`visible`, which does not detect ancestor clipping).
  //
  // KNOWN BUG (see task-14-report.md): at the default 1280x720 desktop
  // viewport, in the tool's own default state, .canvasArea's stacked content
  // (~688px) is taller than its flex slot (~647px). .canvasArea has no
  // overflow-y and vertically centers its children, so the excess is
  // silently clipped by the overflow:hidden ancestor chain (.app/.appBody/
  // #main-content) instead of becoming scrollable — the bottom of ShotTable
  // lands ~12px past the window edge. Suggested fix: give .canvasArea
  // `overflow-y: auto` (matching the project's own "panels scroll
  // internally" rule) so the excess is reachable instead of clipped.
  test('desktop canvas column fits without page scroll and shows scene strip, diagram, and shot table', async ({ page }) => {
    test.fail(true, 'BUG: ShotTable overflows past the bottom of a 1280x720 viewport because .canvasArea has no internal scroll — see task-14-report.md')

    await page.goto(URL)

    const sceneStrip = page.locator('[class*="sceneStripWrap"]').first()
    const diagram = page.getByRole('img', { name: 'Focus Stack Diagram' }).first()
    const table = page.locator('[class*="tableWrap"]').first()

    await expect(sceneStrip).toBeVisible()
    await expect(diagram).toBeVisible()
    await expect(table).toBeVisible()

    const innerHeight = await page.evaluate(() => window.innerHeight)
    for (const locator of [sceneStrip, diagram, table]) {
      const box = await locator.boundingBox()
      expect(box).not.toBeNull()
      expect(box!.y).toBeGreaterThanOrEqual(0)
      expect(box!.y + box!.height).toBeLessThanOrEqual(innerHeight)
    }

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
  //
  // KNOWN BUG (see task-14-report.md): the same .canvasArea overflow above
  // pushes this button (the first child of the centered, overflowing stack)
  // up past the top of its flex slot, landing underneath the site Nav bar
  // (z-index 1000) at the default 1280x720 viewport. A real click there
  // lands on the Nav, not the button — this is not a selector problem.
  test('animate button starts the sweep and swaps to the pause label', async ({ page }) => {
    test.fail(true, 'BUG: the play button renders behind the Nav bar at 1280x720 — see task-14-report.md')

    await page.goto(URL)
    const playButton = page.getByRole('button', { name: 'Animate stack', exact: true })
    await playButton.click({ timeout: 5000 })

    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible()
    await expect(page.locator('[class*="rowActive"]').first()).toBeVisible({ timeout: 2000 })
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
