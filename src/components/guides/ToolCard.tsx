'use client'

import { useTranslations } from 'next-intl'
import { trackGuideToolClick } from '@/lib/analytics'
import { getToolBySlug, getToolStatus } from '@/lib/data/tools'
import { ToolIcon } from '@/components/shared/ToolIcon'
import { Link } from '@/lib/i18n/navigation'
import styles from './ToolCard.module.css'

interface ToolCardProps {
  slug: string
  guideSlug?: string
}

export function ToolCard({ slug, guideSlug }: ToolCardProps) {
  const t = useTranslations('tools')
  const tool = getToolBySlug(slug)
  if (!tool || getToolStatus(tool) === 'disabled') return null
  return (
    <Link
      href={`/${tool.slug}`}
      prefetch={false}
      className={styles.card}
      onClick={() => {
        if (guideSlug) trackGuideToolClick({ guide_slug: guideSlug, tool_slug: tool.slug, source: 'tool-card' })
      }}
    >
      <ToolIcon slug={tool.slug} width={20} height={20} className={styles.icon} />
      <span className={styles.text}>
        <span className={styles.name}>{t(`${tool.slug}.name`)}</span>
        <span className={styles.description}>{t(`${tool.slug}.description`)}</span>
      </span>
    </Link>
  )
}
