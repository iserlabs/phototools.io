import { test, expect } from '@playwright/test'

// TEMPORARY diagnostic (not committed).
test.beforeEach(async ({ page }) => {
  await page.goto('/sensor-size-comparison')
})

test('compare these two (instrumented)', async ({ page }) => {
  const logs: string[] = []
  page.on('console', (m) => { if (m.text().startsWith('[diag]')) logs.push(m.text()) })
  await page.addInitScript(() => {
    const t0 = performance.now()
    const ts = () => (performance.now() - t0).toFixed(0) + 'ms'
    const orig = history.replaceState.bind(history)
    history.replaceState = (d: unknown, u: string, url?: string | URL | null) => {
      console.log('[diag]', ts(), 'replaceState', String(url ?? ''), d && typeof d === 'object' && '__NA' in (d as object) ? '(next)' : '(app)')
      return orig(d, u, url)
    }
    document.addEventListener('click', (e) => {
      const t = e.target as Element
      console.log('[diag]', ts(), 'click', t.tagName, (t.textContent || '').slice(0, 24), 'props', Object.keys(t).some((k) => k.startsWith('__reactProps$')))
    }, true)
    let sidebar: Element | null = null
    new MutationObserver(() => {
      const s = document.querySelector('[class*="sidebar"]')
      if (s !== sidebar) { console.log('[diag]', ts(), 'sidebar node', sidebar ? 'REPLACED' : 'first'); sidebar = s }
      const v = document.querySelectorAll('[data-testid="compare-verdict"]').length
      const btn = document.querySelectorAll('[class*="desktopOnly"] button').length
      const key = `${v}/${btn}`
      const w = window as unknown as { __k?: string }
      if (w.__k !== key) { console.log('[diag]', ts(), 'verdicts', v, 'desktopOnly buttons', btn); w.__k = key }
    }).observe(document, { childList: true, subtree: true })
  })
  await page.goto('/en/sensor-size-comparison')
  const panel = page.locator('[class*="sidebar"]').first()
  await panel.locator('label').filter({ hasText: 'Medium Format (44x33)' }).click()
  await panel.locator('label').filter({ hasText: 'Micro Four Thirds' }).click()
  await panel.locator('label').filter({ hasText: 'Smartphone Flagship' }).click()
  const compareBtn = page.locator('[class*="desktopOnly"]').getByRole('button', { name: 'Compare these two' })
  try {
    await expect(compareBtn).toBeVisible()
    await compareBtn.click()
    await expect(page.getByTestId('compare-verdict')).toHaveCount(1)
  } catch (e) {
    await page.waitForTimeout(300)
    console.log('FAILED-RUN\n' + logs.join('\n'))
    throw e
  }
})
