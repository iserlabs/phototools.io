import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { Link } from '@/lib/i18n/navigation'
import styles from '../privacy/legal-page.module.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.about')
  return {
    title: t('title'),
    description: t('description'),
    alternates: getAlternates('/about', locale as Locale),
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </section>
  )
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('about')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: t('title'),
    url: 'https://www.phototools.io/about',
  }

  return (
    <div className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h1 className={styles.title}>{t('title')}</h1>
      <p className={styles.effectiveDate}>{t('subtitle')}</p>

      <Section title={t('sections.whatIs.title')}>
        <p>{t('sections.whatIs.body')}</p>
      </Section>

      <Section title={t('sections.whoIsItFor.title')}>
        <p>{t('sections.whoIsItFor.body')}</p>
      </Section>

      <Section title={t('sections.privacyFirst.title')}>
        <p>{t('sections.privacyFirst.body')}</p>
      </Section>

      <Section title={t('sections.builtBy.title')}>
        <p>{t('sections.builtBy.body')}</p>
      </Section>

      <Section title={t('sections.getInTouch.title')}>
        <p>
          {t.rich('sections.getInTouch.body', {
            contactLink: (chunks) => (
              <Link href="/contact" className={styles.link}>{chunks}</Link>
            ),
          })}
        </p>
      </Section>
    </div>
  )
}
