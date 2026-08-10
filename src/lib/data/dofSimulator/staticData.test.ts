import { describe, it, expect } from 'vitest'
import { FRAMING_PRESETS } from './framing'
import { BOKEH_SHAPE_IDS } from './bokeh'
import { TELECONVERTERS } from './teleconverters'

describe('dofSimulator static data', () => {
  it('framing presets ascend from face to full', () => {
    const heights = FRAMING_PRESETS.map((p) => p.frameHeightMm)
    expect(heights).toEqual([...heights].sort((a, b) => a - b))
    expect(FRAMING_PRESETS[0]).toEqual({ key: 'face', frameHeightMm: 320 })
    expect(FRAMING_PRESETS[4]).toEqual({ key: 'full', frameHeightMm: 1700 })
  })
  it('exposes all 7 bokeh shapes', () => {
    expect(BOKEH_SHAPE_IDS).toHaveLength(7)
    expect(BOKEH_SHAPE_IDS).toContain('cata')
  })
  it('teleconverters multiply FL and cost stops', () => {
    expect(TELECONVERTERS.find((t) => t.id === 'tc14')).toEqual({ id: 'tc14', flFactor: 1.4, stopsLost: 1 })
    expect(TELECONVERTERS.find((t) => t.id === 'tc20')?.stopsLost).toBe(2)
  })
})
