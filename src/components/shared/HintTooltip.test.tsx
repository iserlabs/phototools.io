import { describe, it, expect, beforeAll, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HintTooltip } from './HintTooltip'

// Radix Tooltip positions its content with floating-ui, which needs
// ResizeObserver — jsdom doesn't provide one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub)
})

describe('HintTooltip', () => {
  it('renders the trigger glyph with the caller class and an accessible label', () => {
    render(
      <HintTooltip text="Advertised 50 MP → typical output 12 MP" label="Info: 50 MP" className="badge">
        *
      </HintTooltip>
    )
    const trigger = screen.getByLabelText('Info: 50 MP')
    expect(trigger).toHaveTextContent('*')
    expect(trigger).toHaveClass('badge')
    expect(trigger).toHaveAttribute('tabindex', '0')
  })

  it('opens on focus and portals the content out of overflow-clipped ancestors', async () => {
    const { container } = render(
      <div style={{ overflow: 'hidden', width: 40 }}>
        <HintTooltip text="Sony A1 · Nikon Z8" label="Info: Full Frame" className="badge">
          ?
        </HintTooltip>
      </div>
    )
    fireEvent.focus(screen.getByLabelText('Info: Full Frame'))
    const tooltip = await screen.findByRole('tooltip')
    expect(tooltip).toHaveTextContent('Sony A1 · Nikon Z8')
    // The fix for the clipped-tooltip bug: content must NOT live inside the
    // scroll container (it renders in a portal on document.body instead).
    expect(container.firstChild).not.toContainElement(tooltip)
    expect(document.body).toContainElement(tooltip)
  })

  it('does not toggle a wrapping label’s checkbox when the trigger is clicked', () => {
    const onChange = vi.fn()
    render(
      <label>
        <input type="checkbox" checked={false} onChange={onChange} />
        <HintTooltip text="hint" label="Info: hint" className="badge">
          ?
        </HintTooltip>
      </label>
    )
    fireEvent.click(screen.getByLabelText('Info: hint'))
    expect(onChange).not.toHaveBeenCalled()
  })
})
