import { describe, it, expect } from 'vitest'
import sitemap from './sitemap'
import { locales, defaultLocale } from '@/lib/i18n/routing'
import { getLiveTools } from '@/lib/data/tools'

describe('sitemap()', () => {
  it('returns a non-empty array', async () => {
    const entries = await sitemap()
    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBeGreaterThan(0)
  })

  it('every URL is absolute and uses https://www.phototools.io', async () => {
    const entries = await sitemap()
    for (const e of entries) {
      expect(e.url.startsWith('https://www.phototools.io/')).toBe(true)
    }
  })

  it('every URL is locale-prefixed with a known locale', async () => {
    const entries = await sitemap()
    const localeSet = new Set<string>(locales)
    for (const e of entries) {
      const path = e.url.replace('https://www.phototools.io/', '')
      const first = path.split('/')[0]
      expect(localeSet.has(first)).toBe(true)
    }
  })

  it('includes the homepage for every locale', async () => {
    const entries = await sitemap()
    for (const locale of locales) {
      const url = `https://www.phototools.io/${locale}`
      expect(entries.some((e) => e.url === url)).toBe(true)
    }
  })

  it('includes every live tool for every locale', async () => {
    const entries = await sitemap()
    const toolSlugs = getLiveTools().map((t) => t.slug)
    for (const slug of toolSlugs) {
      for (const locale of locales) {
        const url = `https://www.phototools.io/${locale}/${slug}`
        expect(entries.some((e) => e.url === url)).toBe(true)
      }
    }
  })

  it('includes static info pages (about, contact, privacy, terms, glossary) for every locale', async () => {
    const entries = await sitemap()
    const staticPaths = ['about', 'contact', 'privacy', 'terms', 'learn/glossary']
    for (const path of staticPaths) {
      for (const locale of locales) {
        const url = `https://www.phototools.io/${locale}/${path}`
        expect(entries.some((e) => e.url === url)).toBe(true)
      }
    }
  })

  it('every entry has hreflang alternates including x-default', async () => {
    const entries = await sitemap()
    for (const e of entries) {
      expect(e.alternates?.languages).toBeDefined()
      expect(e.alternates!.languages!['x-default']).toBeDefined()
      // x-default should point at the default locale variant; can be either
      // the bare locale root ("https://.../en") or a locale-prefixed path
      // ("https://.../en/<slug>").
      const xDefault = e.alternates!.languages!['x-default'] as string
      const matchesDefaultPrefix =
        xDefault === `https://www.phototools.io/${defaultLocale}` ||
        xDefault.startsWith(`https://www.phototools.io/${defaultLocale}/`)
      expect(matchesDefaultPrefix).toBe(true)
    }
  })

  it('priority is in the [0, 1] range', async () => {
    const entries = await sitemap()
    for (const e of entries) {
      expect(e.priority).toBeGreaterThanOrEqual(0)
      expect(e.priority).toBeLessThanOrEqual(1)
    }
  })

  it('omits guide URLs when no guides are live', async () => {
    const entries = await sitemap()
    expect(entries.some((e) => e.url.includes('/guides'))).toBe(false)
  })
})
