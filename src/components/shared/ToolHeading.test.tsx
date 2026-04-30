import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { ToolHeading } from './ToolHeading'

const messages = {
  tools: {
    'fov-simulator': { name: 'Field of View Simulator', description: 'compare lenses' },
  },
}

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('ToolHeading', () => {
  it('renders an H1 with the tool name from translations', () => {
    const { container } = renderWithIntl(<ToolHeading slug="fov-simulator" />)
    const h1 = container.querySelector('h1')
    expect(h1).not.toBeNull()
    expect(h1!.textContent).toBe('Field of View Simulator')
  })

  it('uses the sr-only class so the heading does not appear visually', () => {
    const { container } = renderWithIntl(<ToolHeading slug="fov-simulator" />)
    const h1 = container.querySelector('h1')
    expect(h1!.className).toContain('sr-only')
  })
})
