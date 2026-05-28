import { describe, expect, it } from 'vitest'
import { errorKindFor } from './errorKind'

describe('errorKindFor', () => {
  it('returns "unknown" for null/undefined/non-objects', () => {
    expect(errorKindFor(null)).toBe('unknown')
    expect(errorKindFor(undefined)).toBe('unknown')
    expect(errorKindFor('a string')).toBe('unknown')
    expect(errorKindFor(42)).toBe('unknown')
  })

  it('returns "unknown" for an empty object', () => {
    expect(errorKindFor({})).toBe('unknown')
  })

  it('reads a direct .kind property when present', () => {
    expect(errorKindFor({ kind: 'not-sqlite' })).toBe('notLightroom')
    expect(errorKindFor({ kind: 'schema-too-new' })).toBe('schemaTooNew')
    expect(errorKindFor({ kind: 'schema-too-old' })).toBe('schemaTooOld')
    expect(errorKindFor({ kind: 'too-large' })).toBe('tooLarge')
    expect(errorKindFor({ kind: 'corrupt' })).toBe('corrupt')
    expect(errorKindFor({ kind: 'not-lrc-classic' })).toBe('notLightroom')
  })

  it('parses kind from "Unsupported catalog: X" message (Comlink lossy boundary)', () => {
    expect(errorKindFor(new Error('Unsupported catalog: schema-too-new'))).toBe('schemaTooNew')
    expect(errorKindFor(new Error('Unsupported catalog: corrupt'))).toBe('corrupt')
  })

  it('falls back to "tooLarge" for memory/quota messages', () => {
    expect(errorKindFor(new Error('Reached storage quota'))).toBe('tooLarge')
    expect(errorKindFor(new RangeError('Maximum call stack'))).toBe('tooLarge')
    expect(errorKindFor(new Error('out of memory'))).toBe('tooLarge')
  })

  it('falls back to "workerFailed" for worker startup errors', () => {
    expect(errorKindFor(new Error('Worker failed to start'))).toBe('workerFailed')
    expect(errorKindFor(new Error('importScripts threw'))).toBe('workerFailed')
  })

  it('falls back to "parseFailed" for catalog open errors', () => {
    expect(errorKindFor(new Error('Failed to open catalog: blah'))).toBe('parseFailed')
  })

  it('returns "unknown" for unrelated error messages', () => {
    expect(errorKindFor(new Error('Network error'))).toBe('unknown')
    expect(errorKindFor(new TypeError('Cannot read property'))).toBe('unknown')
  })

  it('prefers .kind over message parsing when both are present', () => {
    expect(errorKindFor({ kind: 'corrupt', message: 'Unsupported catalog: schema-too-new' })).toBe('corrupt')
  })

  it('ignores unknown kind values and falls through to message inspection', () => {
    expect(errorKindFor({ kind: 'made-up-kind', message: 'out of memory' })).toBe('tooLarge')
    expect(errorKindFor({ kind: 'made-up-kind' })).toBe('unknown')
  })
})
