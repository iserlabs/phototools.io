import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ExportBar } from './ExportBar'
import { makeFixtureBlob, renderWithAnalyzer } from '../sections/__test-helpers__'

// Markdown path is fully testable under jsdom; the PDF path lives in a
// next/dynamic-loaded PdfExportStage (so @react-pdf/renderer + recharts-to-png
// stay out of the page chunk) and is exercised end-to-end by the Playwright E2E
// (Task 18.1). Here we only assert the bar's buttons + the Markdown clipboard
// flow, so the PDF stage is never mounted.

function renderBar(blob = makeFixtureBlob()) {
  const { wrapper } = renderWithAnalyzer(<ExportBar />, blob)
  return render(wrapper)
}

describe('ExportBar', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('renders all three buttons; Share is disabled', () => {
    renderBar()
    expect(screen.getByRole('button', { name: /export pdf/i })).toBeEnabled()
    expect(screen.getByRole('button', { name: /copy markdown/i })).toBeEnabled()
    const share = screen.getByRole('button', { name: /share via url/i })
    expect(share).toBeDisabled()
  })

  it('copies the Markdown report to the clipboard on click', async () => {
    renderBar()
    fireEvent.click(screen.getByRole('button', { name: /copy markdown/i }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1))
    const written = (navigator.clipboard.writeText as unknown as { mock: { calls: string[][] } }).mock.calls[0][0]
    expect(written.startsWith('# Lightroom Catalog Analysis')).toBe(true)
  })
})
