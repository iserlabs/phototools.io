'use client'

// Plan 1e (Audit B-3): this OVERWRITES the Plan 1d throwaway worker stub.
//
// `useAnalyzer()` returns the canonical FLATTENED context surface from
// EXECUTION-NOTES §2 — `{ status, insightBlob, worker, filter, error,
// loadedFromCache, lastProgress, open, applyFilter, setFilter, reset,
// setYearInReview, close }` — NOT a `{ state, dispatch }` pair. The lifecycle
// (lazy worker creation, IDB cache hydration, progress, error mapping, Sentry
// capture) lives in `AnalyzerProvider`; this hook is the thin accessor that
// all Plan 1f section components consume.

import { useAnalyzerContextValue } from './AnalyzerContext'
import type { AnalyzerContextValue } from './AnalyzerContext'

export type { AnalyzerContextValue, AnalyzerWorker, OpenCatalogMeta } from './AnalyzerContext'

export function useAnalyzer(): AnalyzerContextValue {
  return useAnalyzerContextValue()
}
