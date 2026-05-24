'use client'

import { useTranslations } from 'next-intl'
import { FilePicker, type FilePickerMeta } from './FilePicker'
import { PrivacyBadge } from './PrivacyBadge'
import { RecentSharesList } from './RecentSharesList'
import styles from './LightroomCatalogAnalyzer.module.css'

interface DesktopEmptyStateProps {
  onFile: (buffer: ArrayBuffer, meta: FilePickerMeta) => void
  onDemo: () => void
}

// A curated preview of what the dashboard surfaces. These are existing,
// already-translated section titles (toolUI…sections.<id>.title) — no new
// i18n keys — doubling as a value teaser on the otherwise-empty landing view.
const PREVIEW_SECTIONS = [
  'gear',
  'focal-length',
  'apertures',
  'time-of-day',
  'heatmap',
  'gps-map',
  'curation-funnel',
  'ratings',
] as const

export function DesktopEmptyState({ onFile, onDemo }: DesktopEmptyStateProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  const tt = useTranslations('tools')
  const ts = useTranslations('toolUI.lightroom-catalog-analyzer.sections')

  return (
    <section className={styles.desktopEmpty} data-testid="desktop-empty">
      <div className={styles.emptyGrid}>
        <div className={styles.emptyMain}>
          <p className={styles.eyebrow}>{tt('lightroom-catalog-analyzer.name')}</p>
          <h1 className={styles.emptyHeadline}>{t('desktop.headline')}</h1>
          <p className={styles.emptySubhead}>{t('desktop.subhead')}</p>

          <FilePicker onFile={onFile} />

          <button type="button" className={styles.demoButton} onClick={onDemo}>
            {t('desktop.tryDemo')}
          </button>

          <p className={styles.emptyExplainer}>{t('desktop.explainer')}</p>

          <RecentSharesList />
        </div>

        <aside className={styles.emptyAside} aria-label={t('desktop.headline')}>
          <PrivacyBadge />
          <ul className={styles.asideList}>
            {PREVIEW_SECTIONS.map((id) => (
              <li key={id} className={styles.asideItem}>
                <span className={styles.asideDot} aria-hidden="true" />
                {ts(`${id}.title`)}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  )
}
