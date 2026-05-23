'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { PrivacyBadge } from './PrivacyBadge'
import styles from './LightroomCatalogAnalyzer.module.css'

interface MobileSplashProps {
  onDemo: () => void
}

const SCREENSHOT_SOURCES = [
  '/lrcat-screenshots/dashboard-overview.png',
  '/lrcat-screenshots/dashboard-gear.png',
  '/lrcat-screenshots/dashboard-heatmap.png',
] as const

export function MobileSplash({ onDemo }: MobileSplashProps) {
  const t = useTranslations('toolUI.lightroom-catalog-analyzer')
  const [copied, setCopied] = useState(false)

  const onCopyLink = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silent — clipboard may be blocked; the URL is in the address bar.
    }
  }, [])

  return (
    <section className={styles.mobileSplash} data-testid="mobile-splash">
      <header className={styles.mobileHeader}>
        <h1 className={styles.mobileHeadline}>{t('mobile.headline')}</h1>
        <PrivacyBadge />
      </header>
      <p className={styles.mobileBody}>{t('mobile.body')}</p>
      <button type="button" className={styles.mobileDemoButton} onClick={onDemo}>
        {t('mobile.tryDemoCta')}
      </button>
      <div className={styles.mobileScreenshots}>
        {SCREENSHOT_SOURCES.map((src, i) => (
          <Image
            key={src}
            src={src}
            alt={t('mobile.screenshotAlt')}
            className={styles.mobileScreenshot}
            width={720}
            height={480}
            unoptimized
            // Don't fail catastrophically if a placeholder isn't deployed yet.
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
            data-index={i}
          />
        ))}
      </div>
      <p className={styles.mobileFooter}>{t('mobile.openOnDesktop')}</p>
      <button type="button" className={styles.mobileCopyLink} onClick={onCopyLink}>
        {copied ? t('mobile.copyLinkSuccess') : t('mobile.copyLink')}
      </button>
    </section>
  )
}
