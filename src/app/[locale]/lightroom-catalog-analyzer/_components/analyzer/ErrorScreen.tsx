'use client'

import { useTranslations } from 'next-intl'
import styles from './LightroomCatalogAnalyzer.module.css'

interface ErrorScreenProps {
  /** One of the `errors.*` key suffixes from errorKind.ts (or null → unknown). */
  errorKind: string | null
  onRetry: () => void
}

const KNOWN_ERROR_KEYS = new Set([
  'parseFailed', 'workerFailed', 'schemaTooNew', 'schemaTooOld',
  'tooLarge', 'corrupt', 'notLightroom', 'unknown',
])

/**
 * M-5: the `status === 'error'` screen. Renders the localized copy for the
 * current error kind (falling back to the generic "unknown" message) plus a
 * retry affordance back to the empty state.
 */
export function ErrorScreen({ errorKind, onRetry }: ErrorScreenProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer.errors')
  const key = errorKind && KNOWN_ERROR_KEYS.has(errorKind) ? errorKind : 'unknown'

  return (
    <section className={styles.errorWrap} role="alert">
      <h2 className={styles.errorTitle}>{t('title')}</h2>
      <p className={styles.errorMessage}>{t(key)}</p>
      <button type="button" className={styles.errorRetry} onClick={onRetry}>
        {t('retry')}
      </button>
    </section>
  )
}
