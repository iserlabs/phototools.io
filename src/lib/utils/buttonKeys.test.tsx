import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { buttonKeyHandlers } from './buttonKeys'

function setup() {
  const activate = vi.fn()
  const { getByRole } = render(<div role="button" tabIndex={0} {...buttonKeyHandlers(activate)}>Drop</div>)
  return { activate, el: getByRole('button') }
}

describe('buttonKeyHandlers', () => {
  it('activates on Enter keydown', () => {
    const { activate, el } = setup()
    fireEvent.keyDown(el, { key: 'Enter' })
    expect(activate).toHaveBeenCalledTimes(1)
  })

  it('activates on Space keyup, not keydown, and prevents the keydown scroll', () => {
    const { activate, el } = setup()
    const notCancelled = fireEvent.keyDown(el, { key: ' ' })
    expect(notCancelled).toBe(false)
    expect(activate).not.toHaveBeenCalled()
    fireEvent.keyUp(el, { key: ' ' })
    expect(activate).toHaveBeenCalledTimes(1)
  })
})
