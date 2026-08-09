import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { Link } from '@/lib/i18n/navigation'
import type { GuideListItem } from '@/lib/guides/types'
import { formatGuideDate } from '@/lib/guides/format-date'
import styles from './GuideCard.module.css'

interface GuideCardProps {
  guide: GuideListItem
  locale: string
}

export function GuideCard({ guide, locale }: GuideCardProps) {
  const t = useTranslations('guides')
  const updated = formatGuideDate(guide.updatedAt, locale)
  return (
    <Link href={`/guides/${guide.slug}`} prefetch={false} className={styles.card}>
      {guide.heroImage && (
        <Image src={guide.heroImage.src} alt={guide.heroImage.alt} width={640} height={360} className={styles.thumb} />
      )}
      <span className={styles.body}>
        <span className={styles.title}>{guide.title}</span>
        <span className={styles.description}>{guide.description}</span>
        <span className={styles.meta}>
          {t('readTime', { minutes: guide.readTimeMinutes })} · {t('updated', { date: updated })}
        </span>
      </span>
    </Link>
  )
}
