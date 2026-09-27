import { describe, it, expect } from 'vitest'
import { pointerToPolar, hitTest, type WheelPoint } from './wheelHit'
import { hueToPos } from './drawWheel'

const cx = 100, cy = 100, R = 100

describe('pointerToPolar', () => {
  it('maps the top of the wheel to hue 0 and the rim to r 100', () => {
    const p = pointerToPolar(100, 0, cx, cy, R)
    expect(p.hue).toBe(0); expect(p.r).toBe(100); expect(p.inside).toBe(true)
  })
  it('maps right to hue 90 and half radius to r 50', () => {
    const p = pointerToPolar(150, 100, cx, cy, R)
    expect(p.hue).toBe(90); expect(p.r).toBe(50)
  })
  it('clamps r at 100 and reports outside', () => {
    const p = pointerToPolar(100, -50, cx, cy, R)
    expect(p.r).toBe(100); expect(p.inside).toBe(false)
  })
  it('round-trips hueToPos', () => {
    const pos = hueToPos(213, 64, cx, cy, R)
    const p = pointerToPolar(pos.x, pos.y, cx, cy, R)
    expect(p.hue).toBe(213); expect(p.r).toBe(64)
  })
})

describe('hitTest', () => {
  const pts: WheelPoint[] = [{ id: 'a', hue: 0, r: 100 }, { id: 'b', hue: 0, r: 80 }]
  it('returns the nearest point within hitRadius', () => {
    const pos = hueToPos(0, 82, cx, cy, R)   // between a (100) and b (80), nearer b
    expect(hitTest(pts, pos.x, pos.y, cx, cy, R, 12)).toBe('b')
  })
  it('returns null when nothing is within hitRadius', () => {
    expect(hitTest(pts, cx, cy, cx, cy, R, 12)).toBeNull()
  })
})
