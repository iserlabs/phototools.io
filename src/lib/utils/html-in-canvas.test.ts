import { describe, it, expect } from 'vitest'
import { supportsHtmlInCanvas } from './html-in-canvas'

describe('supportsHtmlInCanvas', () => {
  it('returns false when layoutSubtree is not in HTMLCanvasElement prototype', () => {
    expect(supportsHtmlInCanvas()).toBe(false)
  })

  it('returns true when layoutSubtree exists on canvas', () => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'layoutSubtree', {
      value: false, writable: true, configurable: true,
    })
    supportsHtmlInCanvas.reset()
    expect(supportsHtmlInCanvas()).toBe(true)
    delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).layoutSubtree
    supportsHtmlInCanvas.reset()
  })
})
