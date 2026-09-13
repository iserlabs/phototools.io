import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DraftNumberInput } from './DraftNumberInput'

function setup(value = 1) {
  const onChange = vi.fn()
  render(<DraftNumberInput value={value} min={0.1} max={5} step={0.01} onChange={onChange} aria-label="Magnification" />)
  return { input: screen.getByLabelText('Magnification') as HTMLInputElement, onChange }
}

describe('DraftNumberInput', () => {
  it('lets the user type through an out-of-range leading "0" to reach 0.26', () => {
    const { input, onChange } = setup(1)
    fireEvent.change(input, { target: { value: '0' } })
    expect(input.value).toBe('0') // draft kept, not snapped back to "1"
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(input, { target: { value: '0.2' } })
    expect(onChange).toHaveBeenLastCalledWith(0.2)
    fireEvent.change(input, { target: { value: '0.26' } })
    expect(onChange).toHaveBeenLastCalledWith(0.26)
  })

  it('does not commit an empty field or an out-of-range value', () => {
    const { input, onChange } = setup(1)
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.change(input, { target: { value: '9' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('resyncs to the prop value on blur', () => {
    const { input } = setup(1)
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.blur(input)
    expect(input.value).toBe('1')
  })
})
