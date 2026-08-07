import { getTranslations } from 'next-intl/server'
import { GuideCard } from '@/components/guides/GuideCard'
import { getVisibleGuides } from '@/lib/guides/content'
import { Link } from '@/lib/i18n/navigation'
import type { Locale } from '@/lib/i18n/routing'
import styles from './GuidesTeaser.module.css'

export async function GuidesTeaser({ locale }: { locale: Locale }) {
  const guides = getVisibleGuides(locale).slice(0, 3)
  if (guides.length === 0) return null
  const t = await getTranslations('guides')
  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{t('teaserTitle')}</h2>
      <p className={styles.subtitle}>{t('teaserSubtitle')}</p>
      <div className={styles.grid}>
        {guides.map((guide) => (
          <GuideCard key={guide.slug} guide={guide} locale={locale} />
        ))}
      </div>
      <Link href="/guides" prefetch={false} className={styles.cta}>
        {t('teaserCta')}
      </Link>
    </section>
  )
}
