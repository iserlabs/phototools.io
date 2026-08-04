import { describe, it, expect } from 'vitest'
import {
  CHEAT_SCENARIOS, getScenario, WB_VALUES, FOCUS_VALUES, DRIVE_VALUES,
} from './cheatSheet'

describe('CHEAT_SCENARIOS', () => {
  it('has unique scenario ids', () => {
    const ids = CHEAT_SCENARIOS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every scenario has all settings populated', () => {
    for (const s of CHEAT_SCENARIOS) {
      expect(s.aperture).toMatch(/^f\//)
      expect(s.shutter).toBeTruthy()
      expect(s.iso).toBeTruthy()
      expect(s.tipCount).toBeGreaterThan(0)
    }
  })

  it('enum-valued settings only use ids that have i18n value labels', () => {
    for (const s of CHEAT_SCENARIOS) {
      expect(WB_VALUES).toContain(s.whiteBalance)
      expect(FOCUS_VALUES).toContain(s.focusMode)
      expect(DRIVE_VALUES).toContain(s.driveMode)
    }
  })

  it('getScenario falls back to the first scenario for unknown ids', () => {
    expect(getScenario('portrait').id).toBe('portrait')
    expect(getScenario('nope').id).toBe(CHEAT_SCENARIOS[0].id)
  })
})
