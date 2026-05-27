'use client'

import { useTranslations } from 'next-intl'
import { useAnalyzer } from './AnalyzerContext'
import { UploaderPanel } from './UploaderPanel'
import { ExportBar } from './ExportBar'
import { SectionAnchorNav } from '../nav/SectionAnchorNav'
import type { SectionId } from '../nav/sections'
import styles from './ControlSidebar.module.css'

interface ControlSidebarProps {
  activeSection: string | null
  onFile: (file: File) => void
  onDemo: () => void
  onReanalyze: () => void
  onOpenDifferent: () => void
  canReanalyze: boolean
}

export function ControlSidebar({
  activeSection,
  onFile,
  onDemo,
  onReanalyze,
  onOpenDifferent,
  canReanalyze,
}: ControlSidebarProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  const tNav = useTranslations('toolUI.lightroom-catalog-analyzer.sectionNav')
  const { insightBlob, loadedFromCache } = useAnalyzer()
  const meta = insightBlob?.meta

  return (
    <div className={styles.inner}>
      {/* ─── Upload ─── */}
      <UploaderPanel onFile={onFile} onDemo={onDemo} />

      {/* ─── Catalog (only when loaded) ─── */}
      {meta && (
        <>
          <hr className={styles.divider} />
          <section className={styles.group}>
            <h3 className={styles.groupTitle}>{tNav('group.catalog')}</h3>
            <p className={styles.catalogMeta}>
              {t('controls.catalogMeta', {
                count: meta.totalPhotos.toLocaleString(),
                first: meta.dateRange.first.slice(0, 10),
                last: meta.dateRange.last.slice(0, 10),
              })}
            </p>
            {loadedFromCache && (
              <p className={styles.cacheNote}>{t('cacheBadge.label')}</p>
            )}
            <div className={styles.catalogActions}>
              {canReanalyze && (
                <button type="button" className={styles.actionBtn} onClick={onReanalyze}>
                  {t('cacheBadge.reanalyze')}
                </button>
              )}
              <button type="button" className={styles.actionBtnSecondary} onClick={onOpenDifferent}>
                {t('controls.openDifferent')}
              </button>
            </div>
          </section>

          {/* ─── Export & Share ─── */}
          <section className={styles.group}>
            <h3 className={styles.groupTitle}>{t('export.barLabel')}</h3>
            <ExportBar />
          </section>
        </>
      )}

      {/* ─── Sections nav ─── */}
      <SectionAnchorNav activeSection={activeSection as SectionId | null} />
    </div>
  )
}
