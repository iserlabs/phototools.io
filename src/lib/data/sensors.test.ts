import { describe, it, expect } from 'vitest'
import {
  SENSORS, EXTENDED_SENSORS, ALL_SENSORS, SENSOR_GROUP_ORDER, sensorsInGroup,
  COMPARE_PRESETS, getSensor, POPULAR_MODELS, COMMON_MP, calcCropFactor,
} from './sensors'

describe('SENSORS', () => {
  it('all have valid crop factors > 0', () => {
    for (const s of SENSORS) {
      expect(s.cropFactor).toBeGreaterThan(0)
      expect(s.id).toBeTruthy()
      expect(s.name).toBeTruthy()
    }
  })
  it('all have physical dimensions (w, h) in mm', () => {
    for (const s of SENSORS) {
      expect(s.w).toBeGreaterThan(0)
      expect(s.h).toBeGreaterThan(0)
      expect(s.w!).toBeGreaterThan(s.h!) // landscape orientation
    }
  })
  it('all have a display color', () => {
    for (const s of SENSORS) {
      expect(s.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
  it('has unique IDs', () => {
    const ids = SENSORS.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('has full frame with crop factor 1.0', () => {
    const ff = SENSORS.find(s => s.id === 'ff')
    expect(ff?.cropFactor).toBe(1.0)
  })
  it('includes medium format, APS-C, micro four thirds, 1-inch, and phone', () => {
    const ids = SENSORS.map(s => s.id)
    expect(ids).toContain('mf')
    expect(ids).toContain('ff')
    expect(ids).toContain('apsc_n')
    expect(ids).toContain('m43')
    expect(ids).toContain('1in')
    expect(ids).toContain('phone')
  })
  it('full frame is larger than APS-C which is larger than M43', () => {
    const ff = SENSORS.find(s => s.id === 'ff')!
    const apsc = SENSORS.find(s => s.id === 'apsc_n')!
    const m43 = SENSORS.find(s => s.id === 'm43')!
    expect(ff.w!).toBeGreaterThan(apsc.w!)
    expect(apsc.w!).toBeGreaterThan(m43.w!)
  })
})

describe('getSensor', () => {
  it('returns matching sensor', () => {
    expect(getSensor('ff').cropFactor).toBe(1.0)
    expect(getSensor('apsc_n').cropFactor).toBe(1.53)
  })
  it('falls back to full frame for unknown ID', () => {
    expect(getSensor('unknown').id).toBe('ff')
  })
  it('falls back for empty string', () => {
    expect(getSensor('').id).toBe('ff')
  })
  it('returns all sensor types correctly', () => {
    for (const s of SENSORS) {
      expect(getSensor(s.id).id).toBe(s.id)
    }
  })
})

describe('POPULAR_MODELS (legacy SENSORS coverage)', () => {
  it('has entries for every SENSORS sensor', () => {
    for (const s of SENSORS) {
      expect(POPULAR_MODELS[s.id]).toBeDefined()
      expect(POPULAR_MODELS[s.id].length).toBeGreaterThan(0)
    }
  })
})

describe('COMMON_MP (legacy SENSORS coverage)', () => {
  it('has entries for every SENSORS sensor', () => {
    for (const s of SENSORS) {
      expect(COMMON_MP[s.id]).toBeDefined()
      expect(COMMON_MP[s.id].length).toBeGreaterThan(0)
    }
  })
  it('megapixel values are positive and sorted ascending per sensor', () => {
    for (const entries of Object.values(COMMON_MP)) {
      for (let i = 0; i < entries.length; i++) {
        expect(entries[i].mp).toBeGreaterThan(0)
        if (i > 0) expect(entries[i].mp).toBeGreaterThan(entries[i-1].mp)
      }
    }
  })
})

describe('ALL_SENSORS integrity', () => {
  it('EXTENDED_SENSORS has 13 presets and ALL_SENSORS is SENSORS + EXTENDED_SENSORS', () => {
    expect(EXTENDED_SENSORS).toHaveLength(13)
    expect(ALL_SENSORS).toEqual([...SENSORS, ...EXTENDED_SENSORS])
  })
  it('has 23 presets with unique ids', () => {
    expect(ALL_SENSORS).toHaveLength(23)
    expect(new Set(ALL_SENSORS.map(s => s.id)).size).toBe(23)
  })
  it('stored crop factor equals derived (2dp) for every preset', () => {
    for (const s of ALL_SENSORS)
      expect(s.cropFactor).toBeCloseTo(Number(calcCropFactor(s.w!, s.h!).toFixed(2)), 10)
  })
  it('all colors unique across ALL_SENSORS', () => {
    expect(new Set(ALL_SENSORS.map(s => s.color)).size).toBe(23)
  })
  it('every preset has a group; landscape or square dims', () => {
    for (const s of ALL_SENSORS) {
      expect(SENSOR_GROUP_ORDER).toContain(s.group)
      expect(s.w!).toBeGreaterThanOrEqual(s.h!) // 6x6 is square
    }
  })
  it('sensorsInGroup covers all presets, area-descending within group', () => {
    const seen = SENSOR_GROUP_ORDER.flatMap(g => sensorsInGroup(g))
    expect(seen).toHaveLength(23)
    for (const g of SENSOR_GROUP_ORDER) {
      const arr = sensorsInGroup(g)
      for (let i = 1; i < arr.length; i++)
        expect(arr[i].w! * arr[i].h!).toBeLessThanOrEqual(arr[i-1].w! * arr[i-1].h!)
    }
  })
})

describe('audit fixes', () => {
  it.each([['mf_645', 0.65], ['apsh', 1.29], ['1in', 2.73], ['phone', 3.54], ['apsc_c', 1.62]])(
    '%s crop factor corrected to %d', (id, crop) => {
      expect(ALL_SENSORS.find(s => s.id === id)!.cropFactor).toBe(crop)
    })
  it('apsh uses 1D Mark IV dims', () => {
    const s = getSensor('apsh')
    expect(s.w).toBe(27.9); expect(s.h).toBe(18.6)
  })
  it('apsc_c uses Canon\'s corrected 14.8mm height (Appendix A)', () => {
    const s = getSensor('apsc_c')
    expect(s.w).toBe(22.3); expect(s.h).toBe(14.8)
  })
  it('mf_645 name matches its dims', () => {
    expect(getSensor('mf_645').name).toContain('53.4x40')
  })
  it('getSensor falls back to ff by id, not index', () => {
    expect(getSensor('nope').id).toBe('ff')
  })
})

describe('companion data coverage', () => {
  it('every preset has POPULAR_MODELS', () => {
    for (const s of ALL_SENSORS) expect(POPULAR_MODELS[s.id]?.length).toBeGreaterThan(0)
  })
  it('every non-film, non-cine_s16 preset has COMMON_MP, ascending', () => {
    for (const s of ALL_SENSORS.filter(s => s.group !== 'film' && s.id !== 'cine_s16')) {
      const e = COMMON_MP[s.id]
      expect(e?.length).toBeGreaterThan(0)
      for (let i = 1; i < e.length; i++) expect(e[i].mp).toBeGreaterThan(e[i-1].mp)
    }
    for (const s of ALL_SENSORS.filter(s => s.group === 'film' || s.id === 'cine_s16'))
      expect(COMMON_MP[s.id]).toBeUndefined()
  })
})

describe('COMPARE_PRESETS', () => {
  it('has 5 presets whose ids all resolve', () => {
    expect(COMPARE_PRESETS).toHaveLength(5)
    const ids = new Set(ALL_SENSORS.map(s => s.id))
    for (const p of COMPARE_PRESETS) {
      expect(p.sensorIds.length).toBeGreaterThanOrEqual(3)
      for (const id of p.sensorIds) expect(ids.has(id)).toBe(true)
    }
  })
})
