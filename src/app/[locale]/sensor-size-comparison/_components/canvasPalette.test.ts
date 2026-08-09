import { describe, it, expect, afterEach } from 'vitest'
import { getCanvasPalette, invalidateCanvasPalette } from './canvasPalette'

describe('canvasPalette', () => {
  afterEach(() => {
    invalidateCanvasPalette()
  })

  it('reads CSS custom properties and caches until invalidated', () => {
    const el = document.createElement('div')
    el.style.setProperty('--bg-surface', '#111')
    el.style.setProperty('--text-primary', '#eee')
    const p1 = getCanvasPalette(el)
    expect(p1.tooltipBg).toBe('#111')
    expect(p1.tooltipFg).toBe('#eee')
    expect(getCanvasPalette(el)).toBe(p1) // cached
    invalidateCanvasPalette()
    expect(getCanvasPalette(el)).not.toBe(p1)
  })

  it('falls back to dark-theme defaults when the custom properties are unset', () => {
    const el = document.createElement('div')
    const palette = getCanvasPalette(el)
    expect(palette.tooltipBg).toBe('#16181d')
    expect(palette.tooltipFg).toBe('#e8eaed')
  })
})
