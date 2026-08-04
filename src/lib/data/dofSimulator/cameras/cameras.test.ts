import { describe, it, expect } from 'vitest'
import { DOF_CAMERAS, getCameraById, CAMERA_BRANDS } from './index'
import { DOF_SENSORS } from '../sensors'

describe('camera DB validation', () => {
  it('has unique ids', () => {
    const ids = DOF_CAMERAS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('every sensorId resolves to a real sensor', () => {
    const sensorIds = new Set(DOF_SENSORS.map((s) => s.id))
    for (const cam of DOF_CAMERAS) expect(sensorIds, `${cam.id} → ${cam.sensorId}`).toContain(cam.sensorId)
  })
  it('ids follow brand-model kebab-case', () => {
    for (const cam of DOF_CAMERAS) expect(cam.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)+$/)
  })
  it('meets seed minimums', () => {
    const count = (brand: string) => DOF_CAMERAS.filter((c) => c.brand === brand).length
    for (const brand of ['Canon', 'Nikon', 'Sony', 'Fujifilm']) expect(count(brand)).toBeGreaterThanOrEqual(8)
    expect(CAMERA_BRANDS.length).toBeGreaterThanOrEqual(8)
  })
  it('getCameraById resolves a known id and returns undefined for unknown ids', () => {
    expect(getCameraById('nikon-z9')?.brand).toBe('Nikon')
    expect(getCameraById('not-a-real-camera')).toBeUndefined()
  })
})
