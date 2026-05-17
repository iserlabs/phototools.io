'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { getVisibleTools, getToolStatus, getToolBySlug } from '@/lib/data/tools'
import { ToolIcon } from './ToolIcon'
import styles from './RelatedTools.module.css'

interface RelatedToolsProps {
  currentSlug: string
  variant?: 'block' | 'inline'
}

export function RelatedTools({ currentSlug, variant = 'block' }: RelatedToolsProps) {
  const t = useTranslations('common.relatedTools')
  const toolsT = useTranslations('tools')
  const current = getToolBySlug(currentSlug)
  if (!current) return null

  const related = getVisibleTools()
    .filter((tool) => tool.slug !== currentSlug && tool.category === current.category && getToolStatus(tool) === 'live')
    .slice(0, 3)

  if (related.length === 0) return null

  const sectionClass = variant === 'inline' ? styles.inlineSection : styles.section
  const listClass = variant === 'inline' ? styles.inlineList : styles.list
  const cardClass = variant === 'inline' ? styles.inlineCard : styles.card

  return (
    <section className={sectionClass} aria-label={t('title')}>
      <h3 className={styles.heading}>{t('title')}</h3>
      <div className={listClass}>
        {related.map((tool) => (
          <Link key={tool.slug} href={`/${tool.slug}`} prefetch={false} className={cardClass}>
            <ToolIcon slug={tool.slug} width={16} height={16} className={styles.icon} />
            <div className={styles.cardBody}>
              <div className={styles.name}>{toolsT(`${tool.slug}.name`)}</div>
              <div className={styles.desc}>{toolsT(`${tool.slug}.description`)}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
