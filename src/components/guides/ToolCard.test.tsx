import { NextIntlClientProvider } from 'next-intl'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import messages from '@/lib/i18n/messages/en/tools.json'
import { ToolCard } from './ToolCard'

function renderCard(slug: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ToolCard slug={slug} guideSlug="test-guide" />
    </NextIntlClientProvider>
  )
}

describe('ToolCard', () => {
  it('renders name and link for a known tool', () => {
    renderCard('fov-simulator')
    expect(screen.getByRole('link')).toHaveAttribute('href', expect.stringContaining('/fov-simulator'))
  })
  it('renders nothing for an unknown tool slug', () => {
    const { container } = renderCard('does-not-exist')
    expect(container.innerHTML).toBe('')
  })
})
