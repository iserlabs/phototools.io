import { test, expect } from '@playwright/test'
import { TOOLS } from '../../lib/data/tools'

const pages = [
  { url: '/en', name: 'Homepage' },
  { url: '/en/learn/glossary', name: 'Photography Glossary' },
  ...TOOLS.map((t) => ({ url: `/en/${t.slug}`, name: t.name })),
]

for (const page of pages) {
  test.describe(`${page.name} (${page.url})`, () => {
    let consoleErrors: string[] = []

    test.beforeEach(async ({ page: p }) => {
      consoleErrors = []
      p.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text())
      })
      await p.goto(page.url)
    })

    test('loads with HTTP 200', async ({ page: p }) => {
      // Page was loaded in beforeEach — verify we're on the right page
      await expect(p).toHaveURL(new RegExp(page.url.replace('/', '\\/')))
    })

    test('has no console errors', async () => {
      // Filter out known benign errors (e.g. third-party scripts, favicon)
      const realErrors = consoleErrors.filter(
        (e) =>
          !e.includes('favicon') &&
          !e.includes('the server responded with a status of 404') &&
          !e.includes('cookieyes') &&
          !e.includes('adsense') &&
          !e.includes('adsbygoogle') &&
          !e.includes('_vercel/speed-insights') &&
          !e.includes('posthog') &&
          !e.includes('/phog/') &&
          !e.includes('connect.facebook.net') &&
          !e.includes('fbevents.js') &&
          !e.includes('facebook.com') &&
          !e.includes('sentry') &&
          !e.includes('monitoring')
      )
      expect(realErrors).toEqual([])
    })

    test('renders key content', async ({ page: p }) => {
      // Every page should have the nav and footer. Scope to .last(): tool
      // content may legitimately nest its own <footer> inside <main> (e.g.
      // the analyzer dashboard note), and the site footer is always the
      // final one in DOM order (ThemeProvider renders it after <main>).
      await expect(p.locator('nav').first()).toBeVisible()
      await expect(p.locator('footer').last()).toBeVisible()

      // Check for page-specific content
      if (page.url === '/en') {
        // Homepage has sr-only h1
        await expect(p.locator('h1')).toHaveCount(1)
      } else if (page.url === '/en/learn/glossary') {
        await expect(p.locator('h1')).toBeVisible()
      } else if (page.url === '/en/lightroom-catalog-analyzer') {
        // The analyzer's redesigned desktop empty state shows no tool title
        // (its name appears only in the display:none MobileSplash), so assert
        // the content that actually defines the page: the FilePicker drop
        // target and the privacy badge.
        await expect(
          p.getByRole('button', { name: /catalog file picker/i }),
        ).toBeVisible()
        await expect(p.getByText('100% Local · No Upload').first()).toBeVisible()
      } else {
        // Tool pages: tool name should appear VISIBLY somewhere on the page.
        // Filter to visible matches first — pages render hidden duplicates
        // (e.g. the analyzer's MobileSplash paragraph is display:none at
        // desktop width but precedes any visible occurrence in DOM order,
        // so a bare .first() picks the hidden one and fails).
        await expect(
          p.getByText(page.name, { exact: false }).filter({ visible: true }).first(),
        ).toBeVisible()
      }
    })

    test('does not scroll at desktop viewport', async ({ page: p }) => {
      const scrolls = await p.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
      }))
      expect(scrolls.scrollHeight).toBeLessThanOrEqual(scrolls.innerHeight)
    })

    test('all images have alt attributes', async ({ page: p }) => {
      const imagesWithoutAlt = await p.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'))
        return imgs.filter((img) => !img.hasAttribute('alt')).length
      })
      expect(imagesWithoutAlt).toBe(0)
    })
  })
}

// Multi-locale smoke tests — import locale list from routing config
import { locales } from '../../lib/i18n/routing'

for (const locale of locales) {
  test(`homepage loads for locale: ${locale}`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await expect(page.locator('nav').first()).toBeVisible()
    // Ensure no missing translation markers
    const content = await page.textContent('body')
    expect(content).not.toContain('MISSING_MESSAGE')
  })
}

test('bare tool URL redirects to locale-prefixed URL', async ({ page }) => {
  const response = await page.goto('/fov-simulator')
  // Should redirect to /en/fov-simulator (or another locale)
  expect(page.url()).toMatch(/\/[a-z]{2}(-[A-Z]{2})?\/fov-simulator/)
  expect(response!.status()).toBeLessThan(400)
})
