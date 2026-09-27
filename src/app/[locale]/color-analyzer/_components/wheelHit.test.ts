import { describe, it, expect } from 'vitest'
import { pointerToPolar, hitTest, resolvePress, type WheelPoint } from './wheelHit'
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

describe('resolvePress', () => {
  // In guide view a custom target shares its sample's id and sits right under the dot.
  const dots: WheelPoint[] = [{ id: 's1', hue: 40, r: 70 }]
  const targets: WheelPoint[] = [{ id: 's1', hue: 40, r: 70 }]
  const on = hueToPos(40, 70, cx, cy, R)

  it('a press on a dot in custom mode selects it and starts dragging its target', () => {
    expect(resolvePress(dots, targets, true, on.x, on.y, cx, cy, R, 16)).toEqual({ select: 's1', dragTarget: 's1' })
  })
  it('outside custom mode a dot press only selects', () => {
    expect(resolvePress(dots, targets, false, on.x, on.y, cx, cy, R, 16)).toEqual({ select: 's1', dragTarget: null })
  })
  it('a dot pressed while its target sits at another hue only selects', () => {
    const moved: WheelPoint[] = [{ id: 's1', hue: 200, r: 70 }]
    expect(resolvePress(dots, moved, true, on.x, on.y, cx, cy, R, 16)).toEqual({ select: 's1', dragTarget: null })
  })
  it('a press on a bare custom target starts dragging it', () => {
    const t2: WheelPoint[] = [{ id: 's1', hue: 200, r: 70 }]
    const pos = hueToPos(200, 70, cx, cy, R)
    expect(resolvePress(dots, t2, true, pos.x, pos.y, cx, cy, R, 16)).toEqual({ select: null, dragTarget: 's1' })
  })
})
