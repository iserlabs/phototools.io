import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { ToolActions } from './ToolActions'

// ShareModal renders `<Dialog.Root open>` with no `Dialog.Trigger` (it's
// conditionally mounted/unmounted by ToolActions rather than driven by
// Radix's own `open` state), so Radix's internal onCloseAutoFocus has no
// registered trigger to fall back to and drops focus to <body>. ToolActions
// captures document.activeElement at open time and hands it to ShareModal's
// onCloseAutoFocus so it wins the race against Radix's own restoration.
// This test guards that wiring: it must fail if either half is reverted.

const messages = {
  common: {
    actions: {
      copyImage: 'Copy image',
      reset: 'Reset',
      copyLink: 'Copy link',
      share: 'Share',
      embed: 'Embed',
    },
    toast: {
      linkCopied: 'Link copied!',
      imageCopied: 'Copied image!',
      failedToCopy: 'Failed to copy',
      copied: 'Copied!',
    },
    share: {
      title: 'Share & Embed',
      closeModal: 'Close share modal',
      directLink: 'Direct Link',
      markdown: 'Markdown (Reddit, GitHub)',
      bbcode: 'BBCode (Forums)',
      htmlEmbed: 'HTML Embed',
      copy: 'Copy',
      copied: 'Copied',
    },
  },
  tools: {
    'fov-simulator': { name: 'Field of View Simulator', description: 'Compare lenses' },
  },
}

function renderToolActions() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ToolActions toolSlug="fov-simulator" />
    </NextIntlClientProvider>,
  )
}

describe('ToolActions — Share/Embed modal focus restoration', () => {
  it('returns focus to the Embed trigger after closing via the close button', async () => {
    renderToolActions()

    const embedButton = screen.getByRole('button', { name: 'Embed' })
    embedButton.focus()
    expect(document.activeElement).toBe(embedButton)

    fireEvent.click(embedButton)
    const closeButton = await screen.findByRole('button', { name: 'Close share modal' })

    fireEvent.click(closeButton)

    await waitFor(() => expect(document.activeElement).toBe(embedButton))
    expect(document.activeElement).not.toBe(document.body)
  })

  it('returns focus to the Embed trigger after closing via Escape', async () => {
    renderToolActions()

    const embedButton = screen.getByRole('button', { name: 'Embed' })
    embedButton.focus()

    fireEvent.click(embedButton)
    await screen.findByRole('button', { name: 'Close share modal' })

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

    await waitFor(() => expect(document.activeElement).toBe(embedButton))
    expect(document.activeElement).not.toBe(document.body)
  })
})
