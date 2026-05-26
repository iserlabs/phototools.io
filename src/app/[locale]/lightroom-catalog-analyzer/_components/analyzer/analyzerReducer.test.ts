import { describe, it, expect } from 'vitest'
import { analyzerReducer, initialState } from './analyzerReducer'
import type { InsightBlob, ProgressEvent } from '@/lib/lrcat/types'

const stubBlob = { meta: { schemaVersion: 1, catalogVersion: 14, totalPhotos: 100, dateRange: { first: '2024-01-01', last: '2024-12-31' }, parsedAt: 0, catalogHash: 'abc' } } as InsightBlob

describe('analyzerReducer', () => {
  it('returns idle initial state', () => {
    expect(initialState.status).toBe('idle')
    expect(initialState.blob).toBeNull()
    expect(initialState.worker).toBeNull()
  })

  it('parse-start resets to parsing but preserves worker', () => {
    const withWorker = { ...initialState, worker: {} as never, status: 'loaded' as const, blob: stubBlob }
    const next = analyzerReducer(withWorker, { type: 'parse-start' })
    expect(next.status).toBe('parsing')
    expect(next.blob).toBeNull()
    expect(next.worker).toBe(withWorker.worker)
  })

  it('parse-success transitions to loaded', () => {
    const next = analyzerReducer(initialState, { type: 'parse-success', blob: stubBlob, loadedFromCache: false })
    expect(next.status).toBe('loaded')
    expect(next.blob).toBe(stubBlob)
    expect(next.loadedFromCache).toBe(false)
  })

  it('parse-failure transitions to error', () => {
    const next = analyzerReducer(initialState, { type: 'parse-failure', kind: 'corrupt' })
    expect(next.status).toBe('error')
    expect(next.errorKind).toBe('corrupt')
  })

  it('parse-progress stores the last event', () => {
    const ev: ProgressEvent = { stage: 'hashing', pct: 42 }
    const next = analyzerReducer(initialState, { type: 'parse-progress', ev })
    expect(next.lastProgress).toBe(ev)
  })

  it('filter-applied sets blob and filter', () => {
    const filter = { cameras: ['X100V'] }
    const next = analyzerReducer(
      { ...initialState, status: 'loaded', blob: stubBlob },
      { type: 'filter-applied', blob: stubBlob, filter },
    )
    expect(next.filter).toBe(filter)
    expect(next.blob).toBe(stubBlob)
  })

  it('reset-filter clears filter and replaces blob', () => {
    const next = analyzerReducer(
      { ...initialState, status: 'loaded', blob: stubBlob, filter: { cameras: ['X100V'] } },
      { type: 'reset-filter', blob: stubBlob },
    )
    expect(next.filter).toBeUndefined()
    expect(next.blob).toBe(stubBlob)
  })

  it('patch-blob merges partial into existing blob', () => {
    const partial = { yearInReview: null }
    const next = analyzerReducer(
      { ...initialState, status: 'loaded', blob: stubBlob },
      { type: 'patch-blob', partial },
    )
    expect(next.blob!.yearInReview).toBeNull()
  })

  it('patch-blob is a no-op when blob is null', () => {
    const next = analyzerReducer(initialState, { type: 'patch-blob', partial: {} })
    expect(next).toBe(initialState)
  })

  it('reset returns to initial state', () => {
    const next = analyzerReducer(
      { ...initialState, status: 'loaded', blob: stubBlob },
      { type: 'reset' },
    )
    expect(next).toEqual(initialState)
  })
})
