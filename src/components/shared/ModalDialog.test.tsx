import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { ModalDialog } from './ModalDialog'

// jsdom has no `closedBy`, so these exercise the light-dismiss fallback path.
// jsdom's getBoundingClientRect() is all zeros, so any non-zero point is
// "outside" the dialog box.

function Harness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>open</button>
      {open && (
        <ModalDialog aria-label="Test" onClose={() => { onClose(); setOpen(false) }}>
          <input aria-label="field" />
        </ModalDialog>
      )}
    </>
  )
}

describe('ModalDialog', () => {
  it('opens modally and closes on a press that starts and ends on the backdrop', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(screen.getByText('open'))
    const dialog = document.querySelector('dialog')!
    expect(dialog.open).toBe(true)

    fireEvent.pointerDown(dialog, { clientX: 50, clientY: 50 })
    fireEvent.click(dialog, { clientX: 50, clientY: 50 })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(document.querySelector('dialog')).toBeNull()
  })

  it('does not close when a drag starts inside the dialog and ends on the backdrop', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.click(screen.getByText('open'))
    const dialog = document.querySelector('dialog')!

    fireEvent.pointerDown(screen.getByLabelText('field'), { clientX: 0, clientY: 0 })
    // The click of a press/release spanning child -> backdrop targets the dialog.
    fireEvent.click(dialog, { clientX: 50, clientY: 50 })
    expect(onClose).not.toHaveBeenCalled()
    expect(dialog.open).toBe(true)
  })

  it('returns focus to the opener after closing', () => {
    render(<Harness onClose={() => {}} />)
    const opener = screen.getByText('open')
    opener.focus()
    fireEvent.click(opener)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(document.querySelector('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })
})
