'use client'

import { createContext, useContext } from 'react'
import type * as Comlink from 'comlink'
import type {
  InsightBlob,
  AnalysisFilter,
  ProgressEvent,
  YearInReviewBlock,
} from '@/lib/lrcat/types'

export type { ProgressEvent } from '@/lib/lrcat/types'

/**
 * The Comlink-wrapped worker surface (defined in Plan 1d `analyzer.worker.ts`).
 * Re-exported here under the canonical name `AnalyzerWorker` so Plan 1f section
 * components can `import type { AnalyzerWorker } from '../analyzer/AnalyzerContext'`.
 *
 * `openCatalog` (ArrayBuffer, in-memory) takes optional trailing args incl. a
 * precomputed cache hash. `openCatalogFile` (File, streamed to OPFS) handles
 * multi-GB catalogs that can't be held in a single buffer.
 */
export type AnalyzerWorker = Comlink.Remote<{
  openCatalog(
    buffer: ArrayBuffer,
    onProgress?: (e: ProgressEvent) => void | Promise<void>,
    fileSize?: number,
    lastModified?: number,
    precomputedHash?: string,
  ): Promise<InsightBlob>
  openCatalogFile(
    file: File,
    onProgress?: (e: ProgressEvent) => void | Promise<void>,
    precomputedHash?: string,
  ): Promise<InsightBlob>
  applyFilter(filter: AnalysisFilter): Promise<InsightBlob>
  computeYearInReview(year: number): Promise<YearInReviewBlock>
  close(): Promise<void>
}>

export type AnalyzerStatus = 'idle' | 'parsing' | 'loaded' | 'error'

/**
 * Flattened context surface consumed by `useAnalyzer()` and all Plan 1f
 * section components. This is the canonical contract from EXECUTION-NOTES §2 —
 * sections read `insightBlob` (only mounted when `status === 'loaded'`) and the
 * few that re-query (YearInReview, PeriodComparison) call `worker` directly.
 */
export interface AnalyzerContextValue {
  status: AnalyzerStatus
  insightBlob: InsightBlob | null
  worker: AnalyzerWorker | null
  filter: AnalysisFilter | undefined
  error: string | null
  loadedFromCache: boolean
  lastProgress: ProgressEvent | null
  /** Open a catalog. A `File` (user upload) streams to OPFS in the worker to
   *  handle multi-GB catalogs; an `ArrayBuffer` (bundled demo) uses the
   *  in-memory path. */
  open: (source: ArrayBuffer | File, meta: OpenCatalogMeta, opts?: OpenOptions) => Promise<void>
  applyFilter: (filter: AnalysisFilter) => Promise<void>
  setFilter: (filter: AnalysisFilter) => void
  reset: () => void
  setYearInReview: (block: YearInReviewBlock) => void
  close: () => void
}

export interface OpenCatalogMeta {
  name: string
  size: number
  lastModified: number
}

export interface OpenOptions {
  /** Skip the IDB cache and re-parse from the original buffer (m-10 re-analyze). */
  forceFresh?: boolean
}

export const AnalyzerContext = createContext<AnalyzerContextValue | null>(null)

/**
 * Internal accessor — throws if used outside the provider. Public consumers
 * import `useAnalyzer` from `./useAnalyzer` (which re-exports this).
 */
export function useAnalyzerContextValue(): AnalyzerContextValue {
  const ctx = useContext(AnalyzerContext)
  if (!ctx) throw new Error('useAnalyzer must be used inside <AnalyzerProvider>')
  return ctx
}

// Canonical hook. Plan 1f section components import `useAnalyzer` directly from
// this module; `./useAnalyzer` also re-exports an identical delegate. Both paths
// return the same flattened AnalyzerContextValue.
export const useAnalyzer = useAnalyzerContextValue
