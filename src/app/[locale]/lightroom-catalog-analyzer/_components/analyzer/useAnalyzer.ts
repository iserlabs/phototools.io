'use client'

/**
 * Thin accessor hook for the flattened AnalyzerContext surface. Section
 * components consume `useAnalyzer()` to read `insightBlob`, call `worker`
 * methods, or interact with filter state. The lifecycle (lazy worker
 * creation, IDB cache hydration, progress, error mapping, Sentry capture)
 * lives in `AnalyzerProvider`.
 */

import { useAnalyzerContextValue } from './AnalyzerContext'
import type { AnalyzerContextValue } from './AnalyzerContext'

export type { AnalyzerContextValue, AnalyzerWorker, OpenCatalogMeta } from './AnalyzerContext'

export function useAnalyzer(): AnalyzerContextValue {
  return useAnalyzerContextValue()
}
