'use client'

import { useEffect, useRef, type DialogHTMLAttributes, type MouseEvent, type ReactNode } from 'react'

type NativeDialogProps = Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open' | 'onClose' | 'onCancel' | 'closedby'>

interface ModalDialogProps extends NativeDialogProps {
  /** Called once the dialog has closed (Esc, back gesture, backdrop click, or `dialog.close()`). */
  onClose: () => void
  children: ReactNode
}

const supportsClosedBy = () =>
  typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype

/**
 * Native modal `<dialog>` that is open for as long as it is mounted — the
 * parent conditionally renders it and unmounts it from `onClose`.
 *
 * `showModal()` gives us the top layer, an inert background, focus
 * containment and Esc / platform close requests for free; `closedby="any"`
 * adds light dismiss (backdrop click), with the MWG `light-dismiss-a-dialog`
 * coordinate-check fallback for browsers without `closedby` (Safari).
 *
 * Because the parent unmounts the element (rather than calling `close()`),
 * the browser's own close-time focus restoration never runs, so the element
 * that had focus when the dialog opened is refocused after unmount.
 */
export function ModalDialog({ onClose, onClick, children, ...rest }: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const onCloseRef = useRef(onClose)
  const openerRef = useRef<HTMLElement | null>(null)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
    }
    const opener = openerRef.current
    const handleClose = () => onCloseRef.current()
    dialog.addEventListener('close', handleClose)
    return () => {
      dialog.removeEventListener('close', handleClose)
      // Runs after React has removed the dialog (and with it, the inert
      // background), so the opener is focusable again.
      if (opener?.isConnected) opener.focus()
    }
  }, [])

  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    onClick?.(e)
    const dialog = dialogRef.current
    if (!dialog || supportsClosedBy() || e.target !== dialog) return
    const rect = dialog.getBoundingClientRect()
    const inside =
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width
    if (!inside) dialog.close()
  }

  return (
    <dialog ref={dialogRef} closedby="any" onClick={handleClick} {...rest}>
      {children}
    </dialog>
  )
}
