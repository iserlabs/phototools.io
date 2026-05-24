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
import { ErrorScreen } from './ErrorScreen'
import { ControlSidebar } from './ControlSidebar'
import { UploaderPanel } from './UploaderPanel'
import { DrilldownForm } from '../sections/DrilldownForm'
import { ActiveFilterPills } from '../sections/ActiveFilterPills'
import { ExportBar } from './ExportBar'
import { MobileSectionDropdown } from '../nav/MobileSectionDropdown'
import styles from './LightroomCatalogAnalyzer.module.css'

const DEMO_CATALOG_URL = '/demo-catalogs/phototools-demo.lrcat'

interface LastOpened {
  /** A File (user upload, streamed to OPFS) or ArrayBuffer (bundled demo). */
  source: ArrayBuffer | File
  meta: OpenCatalogMeta
}

function AnalyzerBody() {
  const { status, error, lastProgress, open, reset, close, filter, applyFilter } = useAnalyzer()
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
    (file: File) => {
      const meta: OpenCatalogMeta = { name: file.name, size: file.size, lastModified: file.lastModified }
      lastOpened.current = { source: file, meta }
      void open(file, meta)
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
      lastOpened.current = { source: buffer, meta }
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
    if (last) void open(last.source, last.meta, { forceFresh: true })
  }, [open])

  const onOpenDifferent = useCallback(() => {
    // close() transitions back to idle (empty state) so the user can pick a new file.
    close()
  }, [close])

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
        {/* Mobile: sticky section nav + controls (sidebar hidden ≤1024px). */}
        <MobileSectionDropdown />
        <div className={styles.mobileControls}>
          <DrilldownForm />
          <ActiveFilterPills />
          <ExportBar />
        </div>

        <div className={`${styles.shellBody} ${styles.shellBodyLoaded}`}>
          {/* LEFT control sidebar — catalog meta, export/share, section nav. */}
          <aside className={styles.shellSidebar}>
            <ControlSidebar
              activeSection={activeSection}
              onReanalyze={onReanalyze}
              onOpenDifferent={onOpenDifferent}
              canReanalyze={lastOpened.current !== null}
            />
          </aside>

          <main id="lrcat-main" className={styles.shellMain}>
            <Dashboard />
          </main>

          {/* RIGHT rail — the Drilldown Explorer (filter) + active-filter pills. */}
          <aside className={styles.shellSidebarRight}>
            <div className={styles.rightRailInner}>
              <ActiveFilterPills />
              <DrilldownForm />
            </div>
          </aside>
        </div>
      </div>
    )
  }

  // idle: empty state. Same shell as the loaded view — the uploader lives in
  // the persistent left sidebar (UploaderPanel) so opening a catalog is one
  // step, not a landing → dashboard hop. Below 1024px the sidebar hides and the
  // tall MobileSplash takes over (idleShell lets the page scroll there). Desktop
  // + mobile siblings are both rendered; CSS picks which is visible — no JS
  // viewport detection, so no hydration mismatch.
  return (
    <div className={`${styles.shell} ${styles.idleShell}`}>
      <div className={styles.shellBody}>
        <aside className={styles.shellSidebar}>
          <UploaderPanel onFile={onFile} onDemo={onDemo} />
        </aside>

        <main id="lrcat-main" className={styles.shellMain}>
          <div className={styles.desktopEmpty}>
            <DesktopEmptyState />
          </div>
          <div className={styles.mobileSplash}>
            <MobileSplash onDemo={onDemo} />
          </div>
        </main>
      </div>
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
