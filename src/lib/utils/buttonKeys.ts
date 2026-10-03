import type { KeyboardEvent } from 'react'

/**
 * Keyboard activation for a non-<button> element with role="button" (e.g. a
 * file drop zone), matching native <button> behavior: Enter activates on
 * keydown, Space activates on keyup — and Space's default page scroll is
 * suppressed on keydown.
 */
export function buttonKeyHandlers(activate: () => void) {
  return {
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.key === 'Enter') activate()
      else if (e.key === ' ') e.preventDefault()
    },
    onKeyUp: (e: KeyboardEvent<HTMLElement>) => {
      if (e.target !== e.currentTarget) return
      if (e.key === ' ') activate()
    },
  }
}
