import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchCombobox } from './SearchCombobox'

const items = [
  { id: 'a', brand: 'Nikon', name: 'Z8' },
  { id: 'b', brand: 'Sony', name: 'A7 IV' },
]

function setup() {
  const onChange = vi.fn()
  render(
    <SearchCombobox
      items={items}
      groupBy={(i) => i.brand}
      label={(i) => i.name}
      value={null}
      onChange={onChange}
      placeholder="Search"
      clearLabel="Clear"
    />,
  )
  const input = screen.getByRole('combobox')
  fireEvent.focus(input)
  fireEvent.keyDown(input, { key: 'ArrowDown' })
  return { input, onChange }
}

describe('SearchCombobox Enter', () => {
  it('commits the highlighted option', () => {
    const { input, onChange } = setup()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onChange).toHaveBeenCalledWith('a')
  })

  it('ignores the Enter that confirms an IME conversion (mwg: ime-safe-enter-submit)', () => {
    const { input, onChange } = setup()
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229 })
    expect(onChange).not.toHaveBeenCalled()
  })
})
