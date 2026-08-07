'use client'

import { Link } from '@/lib/i18n/navigation'
import { useTranslations } from 'next-intl'
import { trackNavClick } from '@/lib/analytics'
import styles from './Footer.module.css'

interface FooterProps {
  hasGuides?: boolean
}

export function Footer({ hasGuides = false }: FooterProps) {
  const t = useTranslations('common.footer')

  return (
    <footer className={styles.footer}>
      <div className={styles.infoRow}>
        {hasGuides && (
          <Link href="/guides" className={styles.link} data-ph-capture-attribute-source="footer" onClick={() => trackNavClick({ target: 'guides', source: 'footer' })}>{t('guides')}</Link>
        )}
        <Link href="/learn/glossary" className={styles.link} data-ph-capture-attribute-source="footer" onClick={() => trackNavClick({ target: 'glossary', source: 'footer' })}>{t('glossary')}</Link>
        <Link href="/about" className={styles.link} data-ph-capture-attribute-source="footer" onClick={() => trackNavClick({ target: 'about', source: 'footer' })}>{t('about')}</Link>
        {/* prefetch={false}: /contact owns a unique CSS chunk (ContactForm is
            a client component with its own module). Default prefetch causes
            Next.js to emit <link rel="preload" as="style"> for that chunk on
            every page, triggering a "preloaded but not used" console warning. */}
        <Link href="/contact" prefetch={false} className={styles.link} data-ph-capture-attribute-source="footer" onClick={() => trackNavClick({ target: 'contact', source: 'footer' })}>{t('contact')}</Link>
        <Link href="/privacy" className={styles.link} data-ph-capture-attribute-source="footer" onClick={() => trackNavClick({ target: 'privacy', source: 'footer' })}>{t('privacy')}</Link>
        <Link href="/terms" className={styles.link} data-ph-capture-attribute-source="footer" onClick={() => trackNavClick({ target: 'terms', source: 'footer' })}>{t('terms')}</Link>
        <button type="button" className={`cky-banner-element ${styles.cookieButton}`}>{t('cookieSettings')}</button>
        <span className={styles.separator} />
        <p>&copy; {new Date().getFullYear()} PhotoTools</p>
      </div>
    </footer>
  )
}
