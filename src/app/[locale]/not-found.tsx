import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { getLiveTools } from '@/lib/data/tools'
import styles from './not-found.module.css'

export default function NotFoundPage() {
  const t = useTranslations('common.notFound')
  const toolsT = useTranslations('tools')
  const popularSlugs = ['fov-simulator', 'color-scheme-generator', 'exif-viewer', 'star-trail-calculator']
  const tools = getLiveTools().filter((tool) => popularSlugs.includes(tool.slug))

  return (
    <main className={styles.container}>
      <h1 className={styles.code}>404</h1>
      <h2 className={styles.title}>{t('title')}</h2>
      <p className={styles.message}>{t('message')}</p>
      <Link href="/" className={styles.homeLink}>
        &larr; {t('backHome')}
      </Link>
      <h3 className={styles.popularLabel}>{t('popularTools')}</h3>
      <div className={styles.toolList}>
        {tools.map((tool) => (
          <Link key={tool.slug} href={`/${tool.slug}`} className={styles.toolLink}>
            {toolsT(`${tool.slug}.name`)}
          </Link>
        ))}
      </div>
    </main>
  )
}
