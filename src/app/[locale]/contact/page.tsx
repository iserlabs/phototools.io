import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { Link } from '@/lib/i18n/navigation'
import { ContactForm } from './_components/ContactForm'
import styles from './ContactPage.module.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.contact')
  return {
    title: t('title'),
    description: t('description'),
    alternates: getAlternates('/contact', locale as Locale),
  }
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('contact')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: t('title'),
    url: `https://www.phototools.io/${locale}/contact`,
    inLanguage: locale,
  }

  return (
    <div className={styles.container}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={styles.grid}>
        <div className={styles.main}>
          <h1>{t('title')}</h1>
          <p className={styles.description}>{t('description')}</p>
          <ContactForm />
        </div>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3>{t('sidebar.responseTimeTitle')}</h3>
            <p className={styles.sidebarText}>{t('sidebar.responseTimeText')}</p>
          </div>
          <div className={styles.sidebarSection}>
            <h3>{t('sidebar.helpfulLinksTitle')}</h3>
            <ul className={styles.sidebarLinks}>
              <li>
                <Link href="/learn/glossary" className={styles.sidebarLink}>
                  {t('sidebar.glossaryLink')}
                </Link>
              </li>
              <li>
                <Link href="/about" className={styles.sidebarLink}>
                  {t('sidebar.aboutLink')}
                </Link>
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
