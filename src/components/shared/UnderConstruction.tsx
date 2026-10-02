import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { RelatedTools } from './RelatedTools'
import styles from './UnderConstruction.module.css'

interface UnderConstructionProps {
  slug: string
}

/**
 * Placeholder for a tool page whose URL is already indexed/visited but whose
 * app isn't ready for the public. Rendered in place of the tool (not as a 404)
 * so the URL keeps resolving and visitors get routed to live tools instead.
 */
export function UnderConstruction({ slug }: UnderConstructionProps) {
  const t = useTranslations('common.underConstruction')
  const notFoundT = useTranslations('common.notFound')
  const toolsT = useTranslations('tools')

  return (
    <div className={styles.outer}>
      <section className={styles.container}>
        <p className={styles.badge}>{t('badge')}</p>
        <h1 className={styles.title}>{toolsT(`${slug}.name`)}</h1>
        <p className={styles.message}>{t('message')}</p>
        <Link href="/" className={styles.homeLink}>
          &larr; {notFoundT('backHome')}
        </Link>
        <div className={styles.related}>
          <RelatedTools currentSlug={slug} headingAs="h2" />
        </div>
      </section>
    </div>
  )
}
