import { describe, it, expect } from 'vitest'
import { initials } from './initials'

describe('initials', () => {
  it('uppercases the first letter of each word', () => {
    expect(initials('Ada Lovelace')).toBe('AL')
  })

  it('ignores repeated separators', () => {
    expect(initials('grace  brewster  hopper')).toBe('GBH')
  })

  it('returns an empty string for null', () => {
    expect(initials(null)).toBe('')
  })

  it('returns an empty string for an empty name', () => {
    expect(initials('')).toBe('')
  })

  it('returns an empty string for a whitespace-only name', () => {
    expect(initials('   ')).toBe('')
  })
})
