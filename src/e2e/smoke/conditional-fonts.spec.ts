import { test, expect } from '@playwright/test'

// Regression coverage for the ja/bn conditional-font CSS bug: the old rule
// `[lang="ja"] { ... }` targeted <html>, but the next/font `.variable` class
// that defines the --font-ja/--font-bn custom property is applied to
// #main-content (a descendant of <html>), not to <html> itself. Custom
// properties only cascade to descendants of the element they're set on, so
// `[lang="ja"]` alone could never see --font-ja and the declaration was a
// no-op. The fix scopes the selector to `html[lang="ja"] #main-content` (see
// src/app/globals.css). These assertions read the *computed* font-family on
// a genuine descendant of #main-content (not #main-content itself) so the
// test fails again if the selector regresses to the bare `[lang="ja"]` form.

test.describe('Conditional ja/bn fonts', () => {
  test('ja locale resolves Noto Sans JP on a #main-content descendant', async ({ page }) => {
    await page.goto('/ja/fov-simulator')
    const fontFamily = await page.locator('#main-content h1').evaluate(
      (el) => getComputedStyle(el).fontFamily,
    )
    expect(fontFamily).toContain('Noto Sans JP')
  })

  test('bn locale resolves Noto Sans Bengali on a #main-content descendant', async ({ page }) => {
    await page.goto('/bn/fov-simulator')
    const fontFamily = await page.locator('#main-content h1').evaluate(
      (el) => getComputedStyle(el).fontFamily,
    )
    expect(fontFamily).toContain('Noto Sans Bengali')
  })

  test('en locale does not pick up the ja/bn conditional fonts', async ({ page }) => {
    await page.goto('/en/fov-simulator')
    const fontFamily = await page.locator('#main-content h1').evaluate(
      (el) => getComputedStyle(el).fontFamily,
    )
    expect(fontFamily).not.toContain('Noto Sans JP')
    expect(fontFamily).not.toContain('Noto Sans Bengali')
  })
})
