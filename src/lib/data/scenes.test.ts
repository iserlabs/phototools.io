import { describe, it, expect } from 'vitest'
import { SCENES } from './scenes'

describe('SCENES', () => {
  it('has 4 scenes', () => { expect(SCENES).toHaveLength(4) })
  it('all have id, name, and src', () => {
    for (const s of SCENES) {
      expect(s.id).toBeTruthy()
      expect(s.name).toBeTruthy()
      expect(s.src).toBeTruthy()
      expect(s.src.startsWith('/images/')).toBe(true)
    }
  })
  it('IDs are unique', () => {
    const ids = SCENES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
