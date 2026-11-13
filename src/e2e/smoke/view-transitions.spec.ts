import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

/**
 * Guards src/lib/viewTransitions.ts: the layout's <ViewTransition> must animate
 * page navigations only, never the router restore Next.js runs for each tool's
 * URL-sync `history.replaceState`. When it did, input landing during the
 * transition was dropped — the cause of the cross-test e2e flakes (a slider's
 * second fill() or a click right after a URL write silently did nothing).
 */

/** Count document.startViewTransition calls and expose a hook that fires on URL writes. */
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vtCount: number; __onUrlWrite?: (url: string) => void }
    w.__vtCount = 0
    const start = document.startViewTransition?.bind(document)
    if (start) {
      document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
        w.__vtCount++
        return start(arg)
      }) as typeof document.startViewTransition
    }
    const replace = history.replaceState.bind(history)
    history.replaceState = (data: unknown, unused: string, url?: string | URL | null) => {
      const result = replace(data, unused, url)
      if (url) w.__onUrlWrite?.(String(url))
      return result
    }
  })
}

const vtCount = (page: Page) => page.evaluate(() => (window as unknown as { __vtCount: number }).__vtCount)

test.describe('View transitions', () => {
  test('a tool URL-sync write starts no view transition and never drops input', async ({ page }) => {
    await instrument(page)
    await page.goto('/en/exposure-simulator')
    const panel = page.locator('[class*="sidebar"]').first()
    const aperture = panel.locator('input[type="range"]').first()

    await aperture.fill('0')
    await expect(panel.getByText('Very Shallow')).toBeVisible()

    // The moment the debounced URL write for ?ai=0 lands, change the slider
    // again from inside the page — the exact window that used to swallow it.
    await page.evaluate(() => {
      const w = window as unknown as { __onUrlWrite?: (url: string) => void }
      w.__onUrlWrite = (url) => {
        if (!url.includes('ai=0')) return
        w.__onUrlWrite = undefined
        setTimeout(() => {
          const el = document.querySelector('[class*="sidebar"] input[type="range"]') as HTMLInputElement
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, '8')
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
        }, 4)
      }
    })

    await expect(panel.getByText('Very Deep')).toBeVisible()
    await expect(page).toHaveURL(/ai=8/)
    expect(await vtCount(page)).toBe(0)
  })

  test('an in-app link navigation still runs a view transition', async ({ page, browserName }) => {
    await instrument(page)
    await page.goto('/en/exposure-simulator')
    const supported = await page.evaluate(() => typeof document.startViewTransition === 'function')
    test.skip(!supported, `${browserName} has no same-document View Transitions`)

    await page.getByRole('link', { name: 'Glossary' }).first().click()
    await expect(page).toHaveURL(/\/en\/learn\/glossary/)
    await expect.poll(() => vtCount(page)).toBeGreaterThan(0)
  })
})
