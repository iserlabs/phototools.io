import { describe, it, expect } from 'vitest'
import { snapToThirdStop, formatAperture } from './aperture'

describe('snapToThirdStop', () => {
  it('returns an exact ladder value unchanged', () => {
    expect(snapToThirdStop(2.8)).toBe(2.8)
  })
  it('snaps to the nearest third-stop value in log space', () => {
    expect(snapToThirdStop(2.7)).toBe(2.8)
    expect(snapToThirdStop(2.6)).toBe(2.5)
  })
  it('clamps below the ladder minimum to the smallest value', () => {
    expect(snapToThirdStop(0.5)).toBe(1)
  })
})

describe('formatAperture', () => {
  it('formats whole stops without a decimal', () => {
    expect(formatAperture(2)).toBe('f/2')
    expect(formatAperture(8)).toBe('f/8')
  })
  it('formats fractional stops with one decimal', () => {
    expect(formatAperture(2.8)).toBe('f/2.8')
    expect(formatAperture(1.4)).toBe('f/1.4')
  })
})
