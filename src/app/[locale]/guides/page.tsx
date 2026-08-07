import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { GuideCard } from '@/components/guides/GuideCard'
import { getVisibleGuides } from '@/lib/guides/content'
import type { GuideCategory } from '@/lib/guides/types'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import styles from './page.module.css'

const CATEGORY_ORDER: GuideCategory[] = ['techniques', 'gear', 'editing']

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.guides')
  const title = t('title')
  const description = t('description')
  return { title, description, openGraph: { title, description }, alternates: getAlternates('/guides', locale as Locale) }
}

export default async function GuidesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const guides = getVisibleGuides(locale as Locale)
  if (guides.length === 0) notFound()
  const t = await getTranslations('guides')
  return (
    <div className={styles.outer}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t('indexTitle')}</h1>
        <p className={styles.subtitle}>{t('indexSubtitle')}</p>
      </header>
      {CATEGORY_ORDER.map((category) => {
        const inCategory = guides.filter((g) => g.category === category)
        if (inCategory.length === 0) return null
        return (
          <section key={category} className={styles.categorySection}>
            <h2 className={styles.categoryTitle}>{t(`categories.${category}.name`)}</h2>
            <p className={styles.blurb}>{t(`categories.${category}.blurb`)}</p>
            <div className={styles.grid}>
              {inCategory.map((guide) => (
                <GuideCard key={guide.slug} guide={guide} locale={locale} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
