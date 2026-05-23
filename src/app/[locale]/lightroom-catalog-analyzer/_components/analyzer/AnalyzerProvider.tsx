'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import * as Comlink from 'comlink'
import * as Sentry from '@sentry/nextjs'
import {
  AnalyzerContext,
  type AnalyzerContextValue,
  type AnalyzerStatus,
  type AnalyzerWorker,
  type OpenCatalogMeta,
  type OpenOptions,
} from './AnalyzerContext'
import { createAnalyzerApi, type AnalyzerHandle } from './workerFactory'
import { getCachedInsights, setCachedInsights } from './cache'
import { computeCatalogHash } from '../worker/hash'
import { errorKindFor } from './errorKind'
import type {
  AnalysisFilter,
  InsightBlob,
  ProgressEvent,
  YearInReviewBlock,
} from '@/lib/lrcat/types'

interface ReducerState {
  status: AnalyzerStatus
  blob: InsightBlob | null
  worker: AnalyzerWorker | null
  filter: AnalysisFilter | undefined
  lastProgress: ProgressEvent | null
  errorKind: string | null
  loadedFromCache: boolean
}

type Action =
  | { type: 'parse-start' }
  | { type: 'worker-ready'; worker: AnalyzerWorker }
  | { type: 'parse-progress'; ev: ProgressEvent }
  | { type: 'parse-success'; blob: InsightBlob; loadedFromCache: boolean }
  | { type: 'parse-failure'; kind: string }
  | { type: 'filter-applied'; blob: InsightBlob; filter: AnalysisFilter }
  | { type: 'reset-filter'; blob: InsightBlob }
  | { type: 'set-filter'; filter: AnalysisFilter | undefined }
  | { type: 'patch-blob'; partial: Partial<InsightBlob> }
  | { type: 'reset' }

const initialState: ReducerState = {
  status: 'idle',
  blob: null,
  worker: null,
  filter: undefined,
  lastProgress: null,
  errorKind: null,
  loadedFromCache: false,
}

function reducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case 'parse-start':
      return { ...initialState, worker: state.worker, status: 'parsing' }
    case 'worker-ready':
      return { ...state, worker: action.worker }
    case 'parse-progress':
      return { ...state, lastProgress: action.ev }
    case 'parse-success':
      return { ...state, status: 'loaded', blob: action.blob, loadedFromCache: action.loadedFromCache, errorKind: null }
    case 'parse-failure':
      return { ...state, status: 'error', errorKind: action.kind }
    case 'filter-applied':
      return { ...state, blob: action.blob, filter: action.filter }
    case 'reset-filter':
      return { ...state, blob: action.blob, filter: undefined }
    case 'set-filter':
      return { ...state, filter: action.filter }
    case 'patch-blob':
      if (!state.blob) return state
      return { ...state, blob: { ...state.blob, ...action.partial } }
    case 'reset':
      return { ...initialState }
    default:
      return state
  }
}

export function AnalyzerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const handleRef = useRef<AnalyzerHandle | null>(null)

  // Tear down the worker on unmount.
  useEffect(() => {
    return () => {
      if (handleRef.current) {
        handleRef.current.dispose()
        handleRef.current = null
      }
    }
  }, [])

  const ensureHandle = useCallback((): AnalyzerHandle => {
    if (!handleRef.current) {
      handleRef.current = createAnalyzerApi()
      dispatch({ type: 'worker-ready', worker: handleRef.current.api })
    }
    return handleRef.current
  }, [])

  const open = useCallback(
    async (buffer: ArrayBuffer, meta: OpenCatalogMeta, opts?: OpenOptions) => {
      dispatch({ type: 'parse-start' })
      const size = meta.size
      let catalogVersion: number | undefined
      try {
        // Try IDB cache first using a non-destructive hash (the buffer is needed
        // for the worker; we deliberately do not transfer it until after hashing).
        // A forced re-analyze (m-10) skips the cache read.
        const hash = await computeCatalogHash(buffer, size, meta.lastModified)
        const cached = opts?.forceFresh ? null : await getCachedInsights(hash)
        if (cached) {
          catalogVersion = cached.meta.catalogVersion
          dispatch({ type: 'parse-progress', ev: { stage: 'finalizing', pct: 100 } })
          dispatch({ type: 'parse-success', blob: cached, loadedFromCache: true })
          return
        }

        const { api } = ensureHandle()
        const onProgress = Comlink.proxy((ev: ProgressEvent) => {
          dispatch({ type: 'parse-progress', ev })
        })
        const blob = await api.openCatalog(
          Comlink.transfer(buffer, [buffer]),
          onProgress,
          size,
          meta.lastModified,
        )
        catalogVersion = blob.meta.catalogVersion
        await setCachedInsights(hash, blob).catch(() => {
          // Non-fatal — a failed cache write must not block rendering.
        })
        dispatch({ type: 'parse-success', blob, loadedFromCache: false })
      } catch (e) {
        const kind = errorKindFor(e)
        // M-4: capture an ANONYMIZED payload — never filenames or content.
        Sentry.captureException(e, {
          tags: { feature: 'lrcat-analyzer', errorKind: kind },
          extra: { size, catalogVersion, errorKind: kind },
        })
        dispatch({ type: 'parse-failure', kind })
      }
    },
    [ensureHandle],
  )

  const applyFilter = useCallback(
    async (filter: AnalysisFilter) => {
      const handle = handleRef.current
      if (!handle) return
      const blob = await handle.api.applyFilter(filter)
      dispatch({ type: 'filter-applied', blob, filter })
    },
    [],
  )

  const setFilter = useCallback((filter: AnalysisFilter) => {
    dispatch({ type: 'set-filter', filter })
  }, [])

  const reset = useCallback(async () => {
    const handle = handleRef.current
    if (handle) {
      // Re-aggregate UNFILTERED so the dashboard reflects the cleared filter —
      // clearing the filter accessor alone would leave stale filtered charts.
      const blob = await handle.api.applyFilter({})
      dispatch({ type: 'reset-filter', blob })
    } else {
      dispatch({ type: 'set-filter', filter: undefined })
    }
  }, [])

  const setYearInReview = useCallback((block: YearInReviewBlock) => {
    dispatch({ type: 'patch-blob', partial: { yearInReview: block } })
  }, [])

  const close = useCallback(() => {
    const handle = handleRef.current
    if (handle) {
      void handle.api.close().catch(() => { /* noop */ })
      handle.dispose()
      handleRef.current = null
    }
    dispatch({ type: 'reset' })
  }, [])

  const value = useMemo<AnalyzerContextValue>(
    () => ({
      status: state.status,
      insightBlob: state.blob,
      worker: state.worker,
      filter: state.filter,
      error: state.errorKind,
      loadedFromCache: state.loadedFromCache,
      lastProgress: state.lastProgress,
      open,
      applyFilter,
      setFilter,
      reset,
      setYearInReview,
      close,
    }),
    [state, open, applyFilter, setFilter, reset, setYearInReview, close],
  )

  return <AnalyzerContext.Provider value={value}>{children}</AnalyzerContext.Provider>
}
