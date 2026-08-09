import { test, expect } from '@playwright/test'

/**
 * Guide pages are the documented exception to the app's no-page-scroll rule:
 * long-form prose scrolls as an ordinary document. The app shell makes that
 * non-automatic — `#main-content` is locked to the viewport height with
 * `overflow: hidden`, so a page whose root doesn't create its own scroll
 * container gets silently clipped with no way to reach the rest.
 *
 * These run at a desktop viewport on purpose; below 1023px `html, body` get
 * `overflow-y: auto` and the whole question goes away.
 */

const DESKTOP = { width: 1440, height: 900 }

/** The page-root element the guide routes render inside `#main-content`. */
const PAGE_ROOT = '#main-content > div'

test.describe('guide pages scroll on desktop', () => {
  test.use({ viewport: DESKTOP })

  for (const { name, path } of [
    { name: 'article', path: '/en/guides/macro-photography-getting-started' },
    { name: 'index', path: '/en/guides' },
  ]) {
    test(`${name} page content is reachable by scrolling`, async ({ page }) => {
      const response = await page.goto(path)
      // While every guide is still `status: draft` the section 404s in a
      // production build (see guides-phase-a.spec.ts). Skip rather than fail,
      // so this spec starts enforcing on its own the moment a guide goes live.
      test.skip(response?.status() === 404, 'no live guides yet — nothing to scroll')
      const root = page.locator(PAGE_ROOT).first()

      // Precondition: the guide must be longer than the space it has, or the
      // test would pass trivially. Measured as content height vs. the shell's
      // window, which holds whether or not the root scrolls — an
      // `overflow: visible` root just grows, so its own scrollHeight and
      // clientHeight are equal and can't tell us anything.
      const available = await page.evaluate(
        () => document.getElementById('main-content')?.clientHeight ?? 0
      )
      const contentH = await root.evaluate((el) => el.scrollHeight)
      expect(contentH, 'guide should be longer than the window').toBeGreaterThan(available + 1)

      // Nothing may clip that overflow without offering a way to scroll it.
      const clipped = await page.evaluate(() => {
        const mc = document.getElementById('main-content')
        if (!mc) return 'no #main-content'
        const hidden = getComputedStyle(mc).overflowY === 'hidden'
        return hidden && mc.scrollHeight > mc.clientHeight + 1 ? 'clipped' : 'ok'
      })
      expect(clipped, '#main-content is hiding overflow with no scroll container').toBe('ok')

      // And a real wheel gesture has to move something.
      await page.mouse.move(DESKTOP.width / 2, DESKTOP.height / 2)
      await page.mouse.wheel(0, 1500)
      await expect
        .poll(async () => root.evaluate((el) => el.scrollTop), {
          message: 'wheel over the guide moved nothing',
        })
        .toBeGreaterThan(0)
    })
  }
})
