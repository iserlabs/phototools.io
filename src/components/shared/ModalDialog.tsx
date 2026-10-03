'use client'

import { useEffect, useRef, type DialogHTMLAttributes, type MouseEvent, type PointerEvent, type ReactNode } from 'react'

type NativeDialogProps = Omit<DialogHTMLAttributes<HTMLDialogElement>, 'open' | 'onClose' | 'onCancel' | 'closedby' | 'onPointerDown'>

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
const isOutside = (dialog: HTMLDialogElement, x: number, y: number) => {
  const rect = dialog.getBoundingClientRect()
  return y < rect.top || y > rect.top + rect.height || x < rect.left || x > rect.left + rect.width
}

export function ModalDialog({ onClose, onClick, children, ...rest }: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // Fallback light dismiss only: whether the current press *started* on the
  // backdrop. Without this, a drag that starts inside (e.g. selecting text in
  // an input) and ends on the backdrop yields a click whose target is the
  // <dialog> itself and would wrongly close it. `closedby="any"` already
  // requires both press and release outside.
  const pressStartedOutsideRef = useRef(false)
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

  const handlePointerDown = (e: PointerEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current
    pressStartedOutsideRef.current =
      !!dialog && e.target === dialog && isOutside(dialog, e.clientX, e.clientY)
  }

  const handleClick = (e: MouseEvent<HTMLDialogElement>) => {
    onClick?.(e)
    const dialog = dialogRef.current
    const startedOutside = pressStartedOutsideRef.current
    pressStartedOutsideRef.current = false
    if (!dialog || supportsClosedBy() || e.target !== dialog || !startedOutside) return
    if (isOutside(dialog, e.clientX, e.clientY)) dialog.close()
  }

  return (
    <dialog ref={dialogRef} closedby="any" onPointerDown={handlePointerDown} onClick={handleClick} {...rest}>
      {children}
    </dialog>
  )
}
