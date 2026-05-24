import { describe, expect, it } from 'vitest'
import { classifyReadError } from './readError'

describe('classifyReadError', () => {
  it('maps NotReadableError to errorLocked (file held open by another app, e.g. Lightroom)', () => {
    expect(classifyReadError(new DOMException('x', 'NotReadableError'))).toBe('errorLocked')
  })

  it('maps NotFoundError to errorLocked (file moved/changed after selection)', () => {
    expect(classifyReadError(new DOMException('x', 'NotFoundError'))).toBe('errorLocked')
  })

  it('maps SecurityError to errorLocked (OS denied read access)', () => {
    expect(classifyReadError(new DOMException('x', 'SecurityError'))).toBe('errorLocked')
  })

  it('falls back to errorReadFailed for a generic Error', () => {
    expect(classifyReadError(new Error('boom'))).toBe('errorReadFailed')
  })

  it('falls back to errorReadFailed for non-error values', () => {
    expect(classifyReadError(undefined)).toBe('errorReadFailed')
    expect(classifyReadError('nope')).toBe('errorReadFailed')
  })
})
