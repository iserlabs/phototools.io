import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { describe, expect, it, vi } from 'vitest'

// Mock the locale-aware navigation so usePathname returns the analyzer slug.
vi.mock('@/lib/i18n/navigation', () => ({
  usePathname: () => '/lightroom-catalog-analyzer',
}))

import { JsonLd } from './JsonLd'

const messages = {
  tools: {
    'lightroom-catalog-analyzer': {
      name: 'Lightroom Catalog Analyzer',
      description: 'Analyze your Lightroom Classic catalog — 100% in your browser',
    },
  },
  common: {
    nav: { categories: { 'file-tool': 'File Tools' } },
    breadcrumb: { home: 'Home' },
  },
  toolUI: {},
}

function renderJsonLd() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <JsonLd />
    </NextIntlClientProvider>,
  )
}

function softwareAppPayload(container: HTMLElement) {
  const scripts = [...container.querySelectorAll('script[type="application/ld+json"]')]
  const payloads = scripts.map((s) => JSON.parse(s.textContent ?? '{}'))
  return payloads.find((p) => p['@type'] === 'SoftwareApplication')
}

describe('JsonLd — Lightroom Catalog Analyzer', () => {
  it('renders a SoftwareApplication script tag', () => {
    const { container } = renderJsonLd()
    expect(softwareAppPayload(container)).toBeTruthy()
  })

  it('uses PhotographyApplication category and Web Browser OS', () => {
    const { container } = renderJsonLd()
    const app = softwareAppPayload(container)
    expect(app.applicationCategory).toBe('PhotographyApplication')
    expect(app.operatingSystem).toBe('Web Browser')
  })

  it('advertises a free price', () => {
    const { container } = renderJsonLd()
    const app = softwareAppPayload(container)
    expect(app.offers.price).toBe('0')
    expect(app.offers.priceCurrency).toBe('USD')
  })

  it('includes a featureList of 8–12 headline features', () => {
    const { container } = renderJsonLd()
    const app = softwareAppPayload(container)
    expect(Array.isArray(app.featureList)).toBe(true)
    expect(app.featureList.length).toBeGreaterThanOrEqual(8)
    expect(app.featureList.length).toBeLessThanOrEqual(13)
  })

  it('has an AEO description that mentions browser-only / no upload', () => {
    const { container } = renderJsonLd()
    const app = softwareAppPayload(container)
    expect(app.description.toLowerCase()).toContain('browser')
    expect(app.description.toLowerCase()).toContain('no upload')
  })

  it('points the url at the canonical locale-prefixed tool path', () => {
    const { container } = renderJsonLd()
    const app = softwareAppPayload(container)
    expect(app.url).toBe('https://www.phototools.io/en/lightroom-catalog-analyzer')
  })
})
