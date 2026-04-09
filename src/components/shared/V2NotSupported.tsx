'use client'

import { useTranslations } from 'next-intl'
import styles from './V2NotSupported.module.css'

interface V2NotSupportedProps {
  v1Href: string
}

export function V2NotSupported({ v1Href }: V2NotSupportedProps) {
  const t = useTranslations('common')
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>{t('v2NotSupported')}</h2>
        <p className={styles.body}>{t('v2NotSupportedBody')}</p>
        <ol className={styles.steps}>
          <li>{t('v2Step1')}</li>
          <li>{t('v2Step2')}</li>
          <li>{t('v2Step3')}</li>
        </ol>
        <a href={v1Href} className={styles.link}>{t('v2BackToV1')}</a>
      </div>
    </div>
  )
}
