import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnimatedGrid, AnimatedItem } from './AnimatedGrid'

describe('AnimatedGrid', () => {
  it('renders children inside a wrapping element', () => {
    render(
      <AnimatedGrid className="my-class">
        <span data-testid="child">hello</span>
      </AnimatedGrid>,
    )
    expect(screen.getByTestId('child').textContent).toBe('hello')
  })

  it('forwards className to the wrapper', () => {
    const { container } = render(
      <AnimatedGrid className="forwarded">
        <span>x</span>
      </AnimatedGrid>,
    )
    expect(container.firstElementChild?.className).toContain('forwarded')
  })
})

describe('AnimatedItem', () => {
  it('applies a stagger delay derived from index', () => {
    const { container } = render(
      <AnimatedItem index={3}>
        <span>x</span>
      </AnimatedItem>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.animationDelay).toBe('150ms')
  })

  it('caps the stagger index so very long lists do not stretch out animation', () => {
    const { container } = render(
      <AnimatedItem index={100}>
        <span>x</span>
      </AnimatedItem>,
    )
    const root = container.firstElementChild as HTMLElement
    // STAGGER_MS=50, MAX_STAGGER_INDEX=24 → 1200ms cap
    expect(root.style.animationDelay).toBe('1200ms')
  })

  it('defaults to no delay when index is omitted', () => {
    const { container } = render(
      <AnimatedItem>
        <span>x</span>
      </AnimatedItem>,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.animationDelay).toBe('0ms')
  })
})
