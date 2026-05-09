'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useTranslations } from 'next-intl'
import styles from './error.module.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('common.error')

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className={styles.container} role="alert" aria-live="assertive">
      <h2 className={styles.title}>{t('title')}</h2>
      <p className={styles.message}>{t('message')}</p>
      <button type="button" onClick={reset} className={styles.button}>
        {t('tryAgain')}
      </button>
    </div>
  )
}
