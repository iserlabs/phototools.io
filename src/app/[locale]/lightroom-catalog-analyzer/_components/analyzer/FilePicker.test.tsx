import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import enMessages from '@/lib/i18n/messages/en/tools/lightroom-catalog-analyzer.json'
import { FilePicker } from './FilePicker'

function renderWithIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>,
  )
}

function makeFile(name: string, sizeBytes: number, content = 'fake'): File {
  // Allocate only a tiny real buffer (a multi-GB string would throw
  // "Invalid string length"); we forcibly override `size` so the component
  // reads the size we want without the memory cost.
  const blob = new Blob([content], { type: 'application/octet-stream' })
  Object.defineProperty(blob, 'size', { value: sizeBytes, configurable: true })
  const file = new File([blob], name)
  Object.defineProperty(file, 'size', { value: sizeBytes, configurable: true })
  return file
}

describe('FilePicker', () => {
  it('renders the drop prompt', () => {
    renderWithIntl(<FilePicker onFile={() => {}} />)
    expect(screen.getByText(/Drop your \.lrcat/i)).toBeInTheDocument()
  })

  it('shows the file name when a valid .lrcat is chosen and calls onFile', async () => {
    const onFile = vi.fn()
    renderWithIntl(<FilePicker onFile={onFile} />)
    const file = makeFile('my-catalog.lrcat', 1024)
    const input = screen.getByLabelText(/catalog file picker/i).querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => expect(onFile).toHaveBeenCalled())
    // The File is passed straight through (the worker streams it to OPFS); we
    // no longer read it into an ArrayBuffer in the main thread.
    expect(onFile.mock.calls[0][0]).toBeInstanceOf(File)
    expect(onFile.mock.calls[0][0].name).toBe('my-catalog.lrcat')
  })

  it('rejects non-.lrcat files with an inline error', async () => {
    const onFile = vi.fn()
    renderWithIntl(<FilePicker onFile={onFile} />)
    const file = makeFile('image.jpg', 1024)
    const input = screen.getByLabelText(/catalog file picker/i).querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByText(/does not look like a Lightroom Classic catalog/i)).toBeInTheDocument()
    })
    expect(onFile).not.toHaveBeenCalled()
  })

  it('shows a warning modal for files > 1 GB and waits for confirmation', async () => {
    const onFile = vi.fn()
    renderWithIntl(<FilePicker onFile={onFile} />)
    const big = makeFile('huge.lrcat', 2 * 1024 * 1024 * 1024) // 2 GB
    const input = screen.getByLabelText(/catalog file picker/i).querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [big] } })
    expect(await screen.findByText(/Large catalog/i)).toBeInTheDocument()
    expect(onFile).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText(/^Continue$/))
    await waitFor(() => expect(onFile).toHaveBeenCalled())
  })

  it('cancelling the large-file warning does not invoke onFile', async () => {
    const onFile = vi.fn()
    renderWithIntl(<FilePicker onFile={onFile} />)
    const big = makeFile('huge.lrcat', 2 * 1024 * 1024 * 1024)
    const input = screen.getByLabelText(/catalog file picker/i).querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [big] } })
    expect(await screen.findByText(/Large catalog/i)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/^Cancel$/))
    await waitFor(() => expect(screen.queryByText(/Large catalog/i)).not.toBeInTheDocument())
    expect(onFile).not.toHaveBeenCalled()
  })
})
