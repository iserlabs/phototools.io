'use client'

import { useTranslations } from 'next-intl'
import styles from './LightroomCatalogAnalyzer.module.css'

interface CacheBadgeProps {
  /** Re-parse the original catalog, bypassing the IDB cache. */
  onReanalyze: () => void
  /** Disabled when no original buffer is available to re-parse (e.g. demo path). */
  canReanalyze: boolean
}

/**
 * m-10: shown when the loaded InsightBlob came from the IDB cache. Offers a
 * "re-analyze" affordance that forces a fresh parse from the original file.
 */
export function CacheBadge({ onReanalyze, canReanalyze }: CacheBadgeProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.cacheBadge')
  return (
    <div className={styles.cacheBadge} role="status">
      <span>{t('label')}</span>
      {canReanalyze && (
        <button
          type="button"
          className={styles.cacheBadgeReanalyze}
          onClick={onReanalyze}
          aria-label={t('reanalyzeAria')}
        >
          {t('reanalyze')}
        </button>
      )}
    </div>
  )
}
