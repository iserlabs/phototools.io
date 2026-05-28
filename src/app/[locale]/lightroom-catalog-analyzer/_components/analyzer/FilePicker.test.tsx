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

  it('rejects zero-byte .lrcat files without calling onFile', async () => {
    const onFile = vi.fn()
    renderWithIntl(<FilePicker onFile={onFile} />)
    const file = makeFile('empty.lrcat', 0)
    const input = screen.getByLabelText(/catalog file picker/i).querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      expect(screen.getByText(/looks empty or hasn't finished downloading/i)).toBeInTheDocument()
    })
    expect(onFile).not.toHaveBeenCalled()
  })

  it('surfaces a read-failure error when the file probe rejects', async () => {
    const onFile = vi.fn()
    const probeError = new Error('Permission denied')
    probeError.name = 'NotReadableError'
    const arrayBufferSpy = vi.spyOn(Blob.prototype, 'arrayBuffer').mockRejectedValueOnce(probeError)
    renderWithIntl(<FilePicker onFile={onFile} />)
    const file = makeFile('locked.lrcat', 1024)
    const input = screen.getByLabelText(/catalog file picker/i).querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [file] } })
    await waitFor(() => {
      // The locked / read-failed error UI surfaces with diagnostic detail
      expect(screen.getByText(/NotReadableError/i)).toBeInTheDocument()
    })
    expect(onFile).not.toHaveBeenCalled()
    arrayBufferSpy.mockRestore()
  })
})
