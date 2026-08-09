import { describe, it, expect, beforeEach } from 'vitest'
import {
  encodeCustomParam, decodeCustomParam, loadCustomSensors, saveCustomSensors,
  ALL_SENSOR_ID_SET,
} from './sensorSizeHelpers'
import { COMMON_MP } from '@/lib/data/sensors'
import { STORAGE_KEY } from './sensorSizeTypes'
import type { CustomSensor } from './sensorSizeTypes'

describe('sensorSizeHelpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips custom sensors with mp on the object', () => {
    const [s] = decodeCustomParam('MySensor~30~20~50')
    expect(s.mp).toBe(50)
    expect(encodeCustomParam([s])).toBe('MySensor~30~20~50')
  })

  it('decode does not mutate COMMON_MP', () => {
    const before = Object.keys(COMMON_MP).length
    decodeCustomParam('X~10~8~12')
    expect(Object.keys(COMMON_MP).length).toBe(before)
  })

  it('ALL_SENSOR_ID_SET includes extended ids', () => {
    expect(ALL_SENSOR_ID_SET.has('film_6x7')).toBe(true)
    expect(ALL_SENSOR_ID_SET.has('cine_a65')).toBe(true)
  })

  it('round-trips a custom sensor with no mp (0)', () => {
    const [s] = decodeCustomParam('NoMp~10~10~0')
    expect(s.mp).toBe(0)
    expect(encodeCustomParam([s])).toBe('NoMp~10~10~0')
  })

  it('saveCustomSensors persists mp from the object, and loadCustomSensors reads it back without touching COMMON_MP', () => {
    const before = Object.keys(COMMON_MP).length
    const sensor: CustomSensor = {
      id: 'custom_1', name: 'Test', w: 20, h: 15, cropFactor: 1.7, color: '#fff', mp: 42,
    }
    saveCustomSensors([sensor])
    const loaded = loadCustomSensors()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].mp).toBe(42)
    expect(Object.keys(COMMON_MP).length).toBe(before)
  })

  it('loadCustomSensors reads an old-shape payload (mp stored in the array) without losing the mp value', () => {
    // Simulates a pre-refactor localStorage payload: an array of
    // StoredCustomSensor objects with `mp` already present on each entry.
    // This is the same on-disk shape the old code wrote (it only differed
    // in how `mp` was *rehydrated* at load time — into COMMON_MP instead of
    // staying on the object). The new loader must read `mp` straight off
    // the stored object and must never touch COMMON_MP.
    const before = Object.keys(COMMON_MP).length
    const oldShapePayload = [
      { id: 'custom_old_1', name: 'Legacy Sensor', w: 36, h: 24, cropFactor: 1.0, color: '#3b82f6', mp: 61 },
    ]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldShapePayload))
    const loaded = loadCustomSensors()
    expect(loaded).toHaveLength(1)
    expect(loaded[0].mp).toBe(61)
    expect(COMMON_MP['custom_old_1']).toBeUndefined()
    expect(Object.keys(COMMON_MP).length).toBe(before)
  })
})
