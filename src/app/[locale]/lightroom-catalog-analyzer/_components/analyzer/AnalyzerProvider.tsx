'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import * as Comlink from 'comlink'
import * as Sentry from '@sentry/nextjs'
import {
  AnalyzerContext,
  type AnalyzerContextValue,
  type OpenCatalogMeta,
  type OpenOptions,
} from './AnalyzerContext'
import { createAnalyzerApi, type AnalyzerHandle } from './workerFactory'
import { getCachedInsights, setCachedInsights } from './cache'
import { computeCatalogHash } from '../worker/hash'
import { errorKindFor } from './errorKind'
import { reducer, initialState } from './analyzerReducer'
import type {
  AnalysisFilter,
  ProgressEvent,
  YearInReviewBlock,
} from '@/lib/lrcat/types'

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
    async (source: ArrayBuffer | File, meta: OpenCatalogMeta, opts?: OpenOptions) => {
      dispatch({ type: 'parse-start' })
      const size = meta.size
      let catalogVersion: number | undefined
      try {
        // The cache key only needs the first 64 KB + size + lastModified, so we
        // never read a multi-GB File into memory to compute it.
        const isFile = typeof File !== 'undefined' && source instanceof File
        const sample = isFile
          ? await source.slice(0, 64 * 1024).arrayBuffer()
          : (source as ArrayBuffer)
        const hash = await computeCatalogHash(sample, size, meta.lastModified)
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
        // File → stream to OPFS in the worker (handles multi-GB catalogs).
        // ArrayBuffer → in-memory deserialize path (bundled demo).
        const blob = isFile
          ? await api.openCatalogFile(source, onProgress, hash)
          : await api.openCatalog(
              Comlink.transfer(source as ArrayBuffer, [source as ArrayBuffer]),
              onProgress,
              size,
              meta.lastModified,
              hash,
            )
        catalogVersion = blob.meta.catalogVersion
        await setCachedInsights(hash, blob).catch(() => {
          // Non-fatal — a failed cache write must not block rendering.
        })
        dispatch({ type: 'parse-success', blob, loadedFromCache: false })
      } catch (e) {
        const kind = errorKindFor(e)
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
      try {
        const blob = await handle.api.applyFilter({})
        dispatch({ type: 'reset-filter', blob })
      } catch {
        dispatch({ type: 'set-filter', filter: undefined })
      }
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
