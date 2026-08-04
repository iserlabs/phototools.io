import { describe, it, expect } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { DOF_BACKGROUNDS, getBackgroundById } from './backgrounds'

describe('background manifests', () => {
  it('has 8 scenes, unique ids, at least 3 highlight-rich', () => {
    expect(DOF_BACKGROUNDS).toHaveLength(8)
    expect(new Set(DOF_BACKGROUNDS.map((b) => b.id)).size).toBe(8)
    expect(DOF_BACKGROUNDS.filter((b) => b.highlightRich).length).toBeGreaterThanOrEqual(3)
  })
  it('every image exists and distances are positive', () => {
    for (const b of DOF_BACKGROUNDS) {
      expect(existsSync(join(process.cwd(), 'public', b.srcLandscape)), b.srcLandscape).toBe(true)
      expect(existsSync(join(process.cwd(), 'public', b.srcPortrait)), b.srcPortrait).toBe(true)
      expect(b.distanceM).toBeGreaterThan(0)
    }
  })
  it('falls back to the first background', () => {
    expect(getBackgroundById('nope').id).toBe(DOF_BACKGROUNDS[0].id)
  })
})
