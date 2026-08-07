import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import commonMessages from '@/lib/i18n/messages/en/common.json'
import toolsMessages from '@/lib/i18n/messages/en/tools.json'
import fovEducationMessages from '@/lib/i18n/messages/en/education/fov-simulator.json'
import fovToolUIMessages from '@/lib/i18n/messages/en/tools/fov-simulator.json'
import { LearnPanel } from './LearnPanel'

// Merged the same way src/lib/i18n/request.ts assembles per-locale messages:
// common.json + tools.json (RelatedTools/FaqSection need tool + faq strings)
// + the fov-simulator education/toolUI files (LearnPanel needs a real skeleton).
const messages = {
  ...commonMessages,
  ...toolsMessages,
  ...fovEducationMessages,
  ...fovToolUIMessages,
}

function renderLearnPanel({
  slug,
  guides,
}: {
  slug: string
  guides?: Array<{ slug: string; title: string }>
}) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LearnPanel slug={slug} guides={guides} />
    </NextIntlClientProvider>
  )
}

describe('LearnPanel guides block', () => {
  it('renders the guides block when guides prop is non-empty', () => {
    renderLearnPanel({ slug: 'fov-simulator', guides: [{ slug: 'macro-guide', title: 'Macro Guide' }] })
    expect(screen.getByText('Related guides')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Macro Guide' })).toHaveAttribute(
      'href',
      expect.stringContaining('/guides/macro-guide')
    )
  })

  it('renders no guides block by default', () => {
    renderLearnPanel({ slug: 'fov-simulator' })
    expect(screen.queryByText('Related guides')).not.toBeInTheDocument()
  })
})
