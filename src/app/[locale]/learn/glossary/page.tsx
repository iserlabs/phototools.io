import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { Glossary } from './_components/Glossary'
import { GLOSSARY } from '@/lib/data/glossary'
import { AdUnit } from '@/components/shared/AdUnit'
import styles from './page.module.css'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.glossary')
  return { title: t('title'), description: t('description'), alternates: getAlternates('/learn/glossary', locale as Locale) }
}

export default async function GlossaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('glossary')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: GLOSSARY.map((entry) => ({
      '@type': 'Question',
      name: `What is ${t(`entries.${entry.id}.term` as Parameters<typeof t>[0])} in photography?`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: t(`entries.${entry.id}.definition` as Parameters<typeof t>[0]),
      },
    })),
  }

  return (
    <div className={styles.outer}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={styles.main}>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 'var(--space-sm)' }}>{t('title')}</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-xl)' }}>
          {t('subtitle')}
        </p>
        <Glossary />
      </div>
      <div className={styles.sidebar}>
        <AdUnit slot="" format="rectangle" channel="glossary_sidebar" />
      </div>
    </div>
  )
}
