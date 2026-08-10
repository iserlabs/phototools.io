import { describe, it, expect } from 'vitest'
import { toSliderPos, fromSliderPos, SLIDER_STEPS } from './logSlider'

describe('toSliderPos / fromSliderPos', () => {
  it('round-trips a value within range', () => {
    const pos = toSliderPos(85, 8, 1200)
    expect(fromSliderPos(pos, 8, 1200)).toBeCloseTo(85, 0)
  })
  it('clamps values outside the range before mapping', () => {
    expect(toSliderPos(4, 8, 1200)).toBe(0)
    expect(toSliderPos(2000, 8, 1200)).toBe(SLIDER_STEPS)
  })
  it('maps the min/max endpoints to 0/SLIDER_STEPS', () => {
    expect(toSliderPos(8, 8, 1200)).toBe(0)
    expect(toSliderPos(1200, 8, 1200)).toBe(SLIDER_STEPS)
  })

  // Prime lenses (e.g. Canon RF 50mm F1.8 STM) report flMin === flMax — a
  // zero-width envelope. Without a guard, log(max) - log(min) === 0 divides
  // by zero and produces NaN, which React renders as an invalid slider value.
  it('does not divide by zero when min === max (prime-lens envelope)', () => {
    expect(toSliderPos(50, 50, 50)).toBe(0)
    expect(fromSliderPos(500, 50, 50)).toBe(50)
    expect(Number.isNaN(toSliderPos(50, 50, 50))).toBe(false)
    expect(Number.isNaN(fromSliderPos(500, 50, 50))).toBe(false)
  })
})
