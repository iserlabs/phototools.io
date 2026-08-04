import { describe, it, expect, vi, afterEach } from 'vitest'
import { safeStorageGet, safeStorageSet } from './safe-storage'

// iOS/macOS Safari with "Block All Cookies" throws a SecurityError on ANY
// window.localStorage access — reading the property itself, not just calling
// getItem/setItem (Sentry PHOTOTOOLS-R: ThemeProvider crashed at
// localStorage.getItem on Mobile Safari 26.5.2). These tests simulate both
// failure shapes: the method throwing, and the property accessor throwing.
const insecure = () => {
  throw new DOMException('The operation is insecure.', 'SecurityError')
}

afterEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe('safeStorageGet', () => {
  it('returns the stored value when storage works', () => {
    window.localStorage.setItem('k', 'v')
    expect(safeStorageGet('k')).toBe('v')
  })

  it('returns null for a missing key', () => {
    expect(safeStorageGet('missing')).toBeNull()
  })

  it('returns null when getItem throws SecurityError', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(insecure)
    expect(safeStorageGet('k')).toBeNull()
  })

  it('returns null when the localStorage property accessor itself throws', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!
    Object.defineProperty(window, 'localStorage', { configurable: true, get: insecure })
    try {
      expect(safeStorageGet('k')).toBeNull()
    } finally {
      Object.defineProperty(window, 'localStorage', original)
    }
  })
})

describe('safeStorageSet', () => {
  it('persists the value when storage works', () => {
    safeStorageSet('k', 'v')
    expect(window.localStorage.getItem('k')).toBe('v')
  })

  it('does not throw when setItem throws SecurityError', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(insecure)
    expect(() => safeStorageSet('k', 'v')).not.toThrow()
  })

  it('does not throw when setItem throws QuotaExceededError', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    expect(() => safeStorageSet('k', 'v')).not.toThrow()
  })

  it('does not throw when the localStorage property accessor itself throws', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!
    Object.defineProperty(window, 'localStorage', { configurable: true, get: insecure })
    try {
      expect(() => safeStorageSet('k', 'v')).not.toThrow()
    } finally {
      Object.defineProperty(window, 'localStorage', original)
    }
  })
})
