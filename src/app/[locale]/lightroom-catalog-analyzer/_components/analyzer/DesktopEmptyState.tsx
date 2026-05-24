'use client'

import { useTranslations } from 'next-intl'
import { RecentSharesList } from './RecentSharesList'
import styles from './LightroomCatalogAnalyzer.module.css'

// A curated preview of what the dashboard surfaces. These are existing,
// already-translated section titles (toolUI…sections.<id>.title) — no new
// i18n keys — doubling as a value teaser beside the sidebar uploader.
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

// The desktop landing's value/learn content. The uploader itself lives in the
// persistent left sidebar (UploaderPanel), so this is the "what you'll get"
// panel shown beside it: headline, summary, a preview of the dashboard
// sections, and any recent shares. No file-picking affordance here.
export function DesktopEmptyState() {
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

          <RecentSharesList />
        </div>

        <aside className={styles.emptyAside} aria-label={t('desktop.headline')}>
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
