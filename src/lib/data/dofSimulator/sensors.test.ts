import { describe, it, expect } from 'vitest'
import { DOF_SENSORS, getDofSensor, sensorAspect } from './sensors'

describe('DOF_SENSORS', () => {
  it('has unique ids', () => {
    const ids = DOF_SENSORS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('includes named phone presets', () => {
    expect(DOF_SENSORS.some((s) => s.id === 'iphone16pro')).toBe(true)
    expect(DOF_SENSORS.some((s) => s.id === 'pixel9pro')).toBe(true)
  })
  it('getDofSensor falls back to full frame', () => {
    expect(getDofSensor('nope').id).toBe('ff')
    expect(getDofSensor('iphone16pro').w).toBeCloseTo(9.8, 1)
  })
  it('sensorAspect gives 1.5 for FF, 4:3 for phones', () => {
    expect(sensorAspect(getDofSensor('ff'))).toBeCloseTo(1.5, 2)
    expect(sensorAspect(getDofSensor('iphone16pro'))).toBeCloseTo(4 / 3, 1)
  })
})
