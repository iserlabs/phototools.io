import { describe, expect, it } from 'vitest'
import { initialState, reducer, type Action, type ReducerState } from './analyzerReducer'
import type { InsightBlob } from '@/lib/lrcat/types'

// Minimal placeholder — never deeply inspected by the reducer.
const blob = { meta: { totalPhotos: 100 } } as unknown as InsightBlob
const blob2 = { meta: { totalPhotos: 200 } } as unknown as InsightBlob

const loadedState: ReducerState = {
  ...initialState,
  status: 'loaded',
  blob,
  loadedFromCache: false,
}

describe('analyzerReducer', () => {
  it('initialState is fully idle', () => {
    expect(initialState.status).toBe('idle')
    expect(initialState.blob).toBeNull()
    expect(initialState.worker).toBeNull()
    expect(initialState.filter).toBeUndefined()
    expect(initialState.errorKind).toBeNull()
    expect(initialState.loadedFromCache).toBe(false)
  })

  it('parse-start clears blob/filter/error but preserves the worker', () => {
    const worker = { foo: 1 } as unknown as NonNullable<ReducerState['worker']>
    const start: ReducerState = { ...initialState, worker, blob, filter: { ratings: [5] }, errorKind: 'corrupt' }
    const next = reducer(start, { type: 'parse-start' })
    expect(next.status).toBe('parsing')
    expect(next.worker).toBe(worker)
    expect(next.blob).toBeNull()
    expect(next.filter).toBeUndefined()
    expect(next.errorKind).toBeNull()
  })

  it('worker-ready attaches the worker without changing status', () => {
    const worker = { x: 1 } as unknown as NonNullable<ReducerState['worker']>
    const next = reducer(initialState, { type: 'worker-ready', worker })
    expect(next.worker).toBe(worker)
    expect(next.status).toBe('idle')
  })

  it('parse-progress records the latest progress event', () => {
    const ev = { stage: 'aggregating', pct: 50 } as ReducerState['lastProgress']
    const next = reducer(initialState, { type: 'parse-progress', ev: ev! })
    expect(next.lastProgress).toBe(ev)
  })

  it('parse-success transitions to loaded and clears any prior errorKind', () => {
    const errored: ReducerState = { ...initialState, status: 'error', errorKind: 'workerFailed' }
    const next = reducer(errored, { type: 'parse-success', blob, loadedFromCache: false })
    expect(next.status).toBe('loaded')
    expect(next.blob).toBe(blob)
    expect(next.errorKind).toBeNull()
    expect(next.loadedFromCache).toBe(false)
  })

  it('parse-success carries loadedFromCache flag through', () => {
    const next = reducer(initialState, { type: 'parse-success', blob, loadedFromCache: true })
    expect(next.loadedFromCache).toBe(true)
  })

  it('parse-failure records errorKind and sets status', () => {
    const next = reducer(initialState, { type: 'parse-failure', kind: 'corrupt' })
    expect(next.status).toBe('error')
    expect(next.errorKind).toBe('corrupt')
  })

  it('filter-applied replaces blob and stores the filter', () => {
    const filter = { ratings: [4, 5] }
    const next = reducer(loadedState, { type: 'filter-applied', blob: blob2, filter })
    expect(next.blob).toBe(blob2)
    expect(next.filter).toBe(filter)
    expect(next.status).toBe('loaded')
  })

  it('reset-filter replaces blob and clears the filter', () => {
    const filtered: ReducerState = { ...loadedState, filter: { ratings: [5] } }
    const next = reducer(filtered, { type: 'reset-filter', blob: blob2 })
    expect(next.blob).toBe(blob2)
    expect(next.filter).toBeUndefined()
  })

  it('set-filter updates filter without touching the blob', () => {
    const filter = { cameras: ['NIKON Z f'] }
    const next = reducer(loadedState, { type: 'set-filter', filter })
    expect(next.filter).toBe(filter)
    expect(next.blob).toBe(loadedState.blob)
  })

  it('set-filter accepts undefined to clear the filter', () => {
    const filtered: ReducerState = { ...loadedState, filter: { ratings: [5] } }
    const next = reducer(filtered, { type: 'set-filter', filter: undefined })
    expect(next.filter).toBeUndefined()
  })

  it('patch-blob merges partial into the existing blob', () => {
    const next = reducer(loadedState, {
      type: 'patch-blob',
      partial: { yearInReview: { year: 2025 } } as unknown as Partial<InsightBlob>,
    })
    expect((next.blob as unknown as { meta: { totalPhotos: number } }).meta.totalPhotos).toBe(100)
    expect((next.blob as unknown as { yearInReview: { year: number } }).yearInReview.year).toBe(2025)
  })

  it('patch-blob is a no-op when there is no blob', () => {
    const next = reducer(initialState, {
      type: 'patch-blob',
      partial: { yearInReview: null } as unknown as Partial<InsightBlob>,
    })
    expect(next).toBe(initialState)
  })

  it('reset returns the initialState', () => {
    const dirty: ReducerState = { ...loadedState, filter: { ratings: [5] }, errorKind: 'corrupt' }
    expect(reducer(dirty, { type: 'reset' })).toEqual(initialState)
  })

  it('unknown action type returns state unchanged', () => {
    const next = reducer(loadedState, { type: 'made-up' } as unknown as Action)
    expect(next).toBe(loadedState)
  })
})
