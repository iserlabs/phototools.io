import { useTranslations } from 'next-intl'
import { getGuide } from '@/lib/guides/content'
import type { Locale } from '@/lib/i18n/routing'
import { Link } from '@/lib/i18n/navigation'
import styles from './RelatedGuides.module.css'

interface RelatedGuidesProps {
  slugs: string[]
  locale: Locale
}

export function RelatedGuides({ slugs, locale }: RelatedGuidesProps) {
  const t = useTranslations('guides')
  const guides = slugs.map((s) => ({ slug: s, guide: getGuide(s, locale) })).filter((g) => g.guide !== null)
  if (guides.length === 0) return null
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{t('relatedGuides')}</h2>
      <ul className={styles.list}>
        {guides.map(({ slug, guide }) => (
          <li key={slug}>
            <Link href={`/guides/${slug}`} prefetch={false} className={styles.link}>
              {guide!.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
