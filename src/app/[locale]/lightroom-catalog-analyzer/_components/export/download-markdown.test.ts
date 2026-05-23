import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadMarkdown, exportFilename } from './download-markdown'

describe('exportFilename', () => {
  it('builds phototools-{hash8}-{date}.{ext}', () => {
    expect(exportFilename('abc123def4567890', new Date('2026-05-23T00:00:00Z'), 'md'))
      .toBe('phototools-abc123de-2026-05-23.md')
    expect(exportFilename('abc123def4567890', new Date('2026-05-23T00:00:00Z'), 'pdf'))
      .toBe('phototools-abc123de-2026-05-23.pdf')
  })
})

describe('downloadMarkdown', () => {
  let clickSpy: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    clickSpy = vi.fn<() => void>()
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:mock'),
      revokeObjectURL: vi.fn(),
    })
    // Intercept anchor clicks so jsdom doesn't try to navigate.
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => clickSpy())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('creates an object URL, clicks an anchor, and revokes the URL', () => {
    downloadMarkdown('# hello', 'phototools-abc123de-2026-05-23.md')
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })
})
