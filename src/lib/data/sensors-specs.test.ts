import { describe, it, expect } from 'vitest'
import { SENSOR_SPECS, SENSORS } from './sensors'

describe('SENSOR_SPECS', () => {
  it('has specs for every preset sensor', () => {
    for (const s of SENSORS) {
      expect(SENSOR_SPECS[s.id]).toBeDefined()
      expect(SENSOR_SPECS[s.id].isoRange).toBeTruthy()
      expect(SENSOR_SPECS[s.id].dynamicRange).toBeGreaterThan(0)
    }
  })

  it('has plausible dynamic range values (8-16 EV)', () => {
    for (const [, spec] of Object.entries(SENSOR_SPECS)) {
      expect(spec.dynamicRange).toBeGreaterThanOrEqual(8)
      expect(spec.dynamicRange).toBeLessThanOrEqual(16)
    }
  })
})
