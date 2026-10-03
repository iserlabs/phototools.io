import { describe, it, expect, vi, afterEach, onTestFinished } from 'vitest'
import { render, act } from '@testing-library/react'
import { useRef } from 'react'
import { useIsRendered } from './useIsRendered'

let seen: boolean[] = []

function Probe({ parent = false }: { parent?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null)
  seen.push(useIsRendered(ref, { parent }))
  return <div data-testid="wrap"><canvas ref={ref} data-testid="canvas" /></div>
}

function skippedEvent(skipped: boolean) {
  const e = new Event('contentvisibilityautostatechange')
  Object.defineProperty(e, 'skipped', { value: skipped })
  return e
}

describe('useIsRendered', () => {
  afterEach(() => { seen = []; vi.unstubAllGlobals() })

  it('follows contentvisibilityautostatechange on the parent when content-visibility is supported', () => {
    expect('contentVisibility' in document.documentElement.style).toBe(true) // jsdom's cssstyle knows it
    const { getByTestId } = render(<Probe parent />)
    expect(seen.at(-1)).toBe(true)
    act(() => { getByTestId('wrap').dispatchEvent(skippedEvent(true)) })
    expect(seen.at(-1)).toBe(false)
    act(() => { getByTestId('wrap').dispatchEvent(skippedEvent(false)) })
    expect(seen.at(-1)).toBe(true)
  })

  it('falls back to IntersectionObserver without content-visibility support', () => {
    // Hide content-visibility support for this test.
    let owner: object | null = document.documentElement.style
    while (owner && !Object.prototype.hasOwnProperty.call(owner, 'contentVisibility')) owner = Object.getPrototypeOf(owner)
    const descriptor = owner ? Object.getOwnPropertyDescriptor(owner, 'contentVisibility') : undefined
    if (owner) delete (owner as { contentVisibility?: unknown }).contentVisibility
    onTestFinished(() => { if (owner && descriptor) Object.defineProperty(owner, 'contentVisibility', descriptor) })
    expect('contentVisibility' in document.documentElement.style).toBe(false)
    let callback: IntersectionObserverCallback = () => {}
    const observe = vi.fn()
    vi.stubGlobal('IntersectionObserver', vi.fn(function (this: unknown, cb: IntersectionObserverCallback) {
      callback = cb
      return { observe, disconnect: vi.fn() }
    }))
    const { getByTestId } = render(<Probe />)
    expect(observe).toHaveBeenCalledWith(getByTestId('canvas'))
    act(() => callback([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(seen.at(-1)).toBe(false)
  })
})
