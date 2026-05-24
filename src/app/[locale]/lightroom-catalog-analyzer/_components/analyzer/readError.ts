/**
 * Classify a FileReader / Blob read failure into a user-facing message key.
 *
 * The most common real-world cause of a `.lrcat` read failing is that the
 * catalog is still **open in Lightroom Classic**, which holds a lock on the
 * file. The browser captures a snapshot reference when the user picks the file,
 * but the actual byte read happens later — if another app is writing to (or
 * locking) the file in the meantime, the platform throws `NotReadableError`
 * (or `NotFoundError` if it moved, `SecurityError` if the OS denied access).
 *
 * For those cases we steer the user toward the fix (quit Lightroom / use a
 * copy) instead of a dead-end "could not read" message.
 *
 * Returns a key suffix under the `filePicker.` i18n namespace.
 */
export function classifyReadError(err: unknown): 'errorLocked' | 'errorReadFailed' {
  const name =
    err instanceof DOMException
      ? err.name
      : typeof err === 'object' && err !== null && 'name' in err
        ? String((err as { name?: unknown }).name)
        : ''

  if (name === 'NotReadableError' || name === 'NotFoundError' || name === 'SecurityError') {
    return 'errorLocked'
  }
  return 'errorReadFailed'
}

/** Normalize an unknown thrown value into a `{ name, message }` pair for display. */
export function describeError(err: unknown): { name: string; message: string } {
  if (err instanceof Error) return { name: err.name || 'Error', message: err.message || '' }
  return { name: 'unknown', message: String(err) }
}
