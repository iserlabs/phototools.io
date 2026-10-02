import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { UnderConstruction } from './UnderConstruction'

// next-intl's navigation Link needs the App Router context; a plain anchor is
// enough here (same stub as JsonLd.test.tsx).
vi.mock('@/lib/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

const messages = {
  common: {
    underConstruction: { badge: 'Under construction', message: 'Rebuilding.' },
    notFound: { backHome: 'Back to Home' },
    relatedTools: { title: 'Related Tools' },
  },
  tools: {
    'dof-simulator': { name: 'Depth-of-Field Simulator', description: 'dof' },
    'fov-simulator': { name: 'Field-of-View Simulator', description: 'fov' },
    'color-scheme-generator': { name: 'Color Scheme Generator', description: 'color' },
    'star-trail-calculator': { name: 'Star Trail Calculator', description: 'stars' },
    'white-balance-visualizer': { name: 'White Balance Visualizer', description: 'wb' },
    'sensor-size-comparison': { name: 'Sensor Size Comparison', description: 'sensor' },
    'megapixels-size-visualizer': { name: 'Megapixels Size Visualizer', description: 'mp' },
  },
}

function renderPlaceholder() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <UnderConstruction slug="dof-simulator" />
    </NextIntlClientProvider>,
  )
}

describe('UnderConstruction', () => {
  it('renders the tool name as the page h1 with the status badge', () => {
    const { container, getByText } = renderPlaceholder()
    expect(container.querySelector('h1')!.textContent).toBe('Depth-of-Field Simulator')
    expect(getByText('Under construction')).toBeTruthy()
    expect(getByText('Rebuilding.')).toBeTruthy()
  })

  it('links home and to live related tools, never to itself', () => {
    const { container } = renderPlaceholder()
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/')
    expect(hrefs.length).toBeGreaterThan(1)
    expect(hrefs).not.toContain('/dof-simulator')
  })

  it('keeps heading order intact (related tools heading is an h2, no h3 skip)', () => {
    const { container } = renderPlaceholder()
    expect(container.querySelector('h2')!.textContent).toBe('Related Tools')
    expect(container.querySelector('h3')).toBeNull()
  })
})
