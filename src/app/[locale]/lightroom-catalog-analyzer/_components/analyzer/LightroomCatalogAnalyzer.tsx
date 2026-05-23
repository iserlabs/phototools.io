'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { AnalyzerProvider } from './AnalyzerProvider'
import { useAnalyzer } from './useAnalyzer'
import type { OpenCatalogMeta } from './AnalyzerContext'
import { useScrollSpy } from './useScrollSpy'
import { useFilterUrlSync } from './useFilterUrlSync'
import { DesktopEmptyState } from './DesktopEmptyState'
import { MobileSplash } from './MobileSplash'
import { ParseProgress } from './ParseProgress'
import { Dashboard } from './Dashboard'
import { CacheBadge } from './CacheBadge'
import { ErrorScreen } from './ErrorScreen'
import { SectionAnchorNav } from '../nav/SectionAnchorNav'
import { MobileSectionDropdown } from '../nav/MobileSectionDropdown'
import styles from './LightroomCatalogAnalyzer.module.css'

const DEMO_CATALOG_URL = '/demo-catalogs/phototools-demo.lrcat'

interface LastOpened {
  buffer: ArrayBuffer
  meta: OpenCatalogMeta
}

function AnalyzerBody() {
  const { status, error, loadedFromCache, lastProgress, open, reset, filter, applyFilter } = useAnalyzer()
  const activeSection = useScrollSpy()
  const searchParams = useSearchParams()
  const demoRequested = searchParams?.get('demo') === 'true'
  const demoStartedRef = useRef(false)
  // Retain the last opened catalog so the m-10 "re-analyze" can re-parse.
  const lastOpened = useRef<LastOpened | null>(null)

  // Bidirectional URL sync for the global filter (Task 12.3). On mount it
  // restores any filter encoded in the URL by calling applyFilter; thereafter
  // it replaceState-pushes serialized filter changes back to the URL.
  useFilterUrlSync(filter, applyFilter, status === 'loaded')

  const onFile = useCallback(
    (buffer: ArrayBuffer, meta: OpenCatalogMeta) => {
      lastOpened.current = { buffer, meta }
      void open(buffer, meta)
    },
    [open],
  )

  const onDemo = useCallback(async () => {
    try {
      const resp = await fetch(DEMO_CATALOG_URL)
      if (!resp.ok) throw new Error(`demo fetch ${resp.status}`)
      const buffer = await resp.arrayBuffer()
      const headers = resp.headers
      const size = Number(headers.get('content-length')) || buffer.byteLength
      const lastModifiedHeader = headers.get('last-modified')
      const lastModified = lastModifiedHeader ? Date.parse(lastModifiedHeader) : Date.now()
      const meta: OpenCatalogMeta = { name: 'phototools-demo.lrcat', size, lastModified }
      lastOpened.current = { buffer, meta }
      void open(buffer, meta)
    } catch {
      // Demo file may not be deployed yet — fail silently in dev.
    }
  }, [open])

  // Autoload the bundled demo catalog when the URL has `?demo=true` (Task 13.2).
  // Guard order: already started → not idle (loaded/parsing/error) → start once.
  useEffect(() => {
    if (!demoRequested) return
    if (demoStartedRef.current) return
    if (status !== 'idle') return
    demoStartedRef.current = true
    void onDemo()
  }, [demoRequested, status, onDemo])

  const onReanalyze = useCallback(() => {
    const last = lastOpened.current
    if (last) void open(last.buffer, last.meta, { forceFresh: true })
  }, [open])

  if (status === 'parsing') {
    return (
      <div className={styles.shell}>
        <main id="lrcat-main" className={styles.shellMain}>
          <ParseProgress
            stage={lastProgress?.stage ?? 'reading'}
            pct={lastProgress?.pct ?? 0}
          />
        </main>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={styles.shell}>
        <main id="lrcat-main" className={styles.shellMain}>
          <ErrorScreen errorKind={error} onRetry={reset} />
        </main>
      </div>
    )
  }

  if (status === 'loaded') {
    return (
      <div className={styles.shell}>
        <MobileSectionDropdown />
        <div className={styles.shellBody}>
          <main id="lrcat-main" className={styles.shellMain}>
            {loadedFromCache && (
              <CacheBadge onReanalyze={onReanalyze} canReanalyze={lastOpened.current !== null} />
            )}
            <Dashboard />
          </main>
          <aside className={styles.shellSidebar}>
            <SectionAnchorNav activeSection={activeSection} />
          </aside>
        </div>
      </div>
    )
  }

  // idle: empty state. Both desktop + mobile siblings rendered; CSS media
  // query decides which is visible. No JS viewport detection.
  return (
    <div className={styles.shell}>
      <main id="lrcat-main" className={styles.shellMain}>
        <div className={styles.desktopEmpty}>
          <DesktopEmptyState onFile={onFile} onDemo={onDemo} />
        </div>
        <div className={styles.mobileSplash}>
          <MobileSplash onDemo={onDemo} />
        </div>
      </main>
    </div>
  )
}

export function LightroomCatalogAnalyzer() {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  return (
    <AnalyzerProvider>
      <a href="#lrcat-main" className={styles.skipLink}>{t('skipToMain')}</a>
      <AnalyzerBody />
    </AnalyzerProvider>
  )
}
