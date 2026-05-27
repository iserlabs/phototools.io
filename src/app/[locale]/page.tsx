import { Link } from '@/lib/i18n/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getLiveTools } from '@/lib/data/tools'
import { ToolIcon } from '@/components/shared/ToolIcon'
import { AnimatedGrid, AnimatedItem } from '@/components/shared/AnimatedGrid'
import type { ToolCategory } from '@/lib/types'
import { AdUnit } from '@/components/shared/AdUnit'
import styles from './page.module.css'

const CATEGORY_KEYS: ToolCategory[] = ['file-tool', 'visualizer', 'calculator', 'reference']

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')
  const toolsT = await getTranslations('tools')
  const tools = getLiveTools()

  const grouped = CATEGORY_KEYS
    .map((key) => ({
      key,
      label: t(`categories.${key}`),
      tools: tools.filter((tool) => tool.category === key),
    }))
    .filter((g) => g.tools.length > 0)

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <h1 className="sr-only">{t('heroTitle')}</h1>
        <p className={styles.heroDesc}>
          {t('heroDesc')}
        </p>
      </div>

      <AdUnit slot="" format="leaderboard" channel="homepage_leaderboard" className={styles.homepageAd} />

      {grouped.map((group) => (
        <section key={group.key} className={styles.category}>
          <h2 className={styles.categoryLabel}>{group.label}</h2>
          <AnimatedGrid className={styles.grid}>
            {group.tools.map((tool, idx) => (
              <AnimatedItem key={tool.slug} index={idx}>
                <Link
                  href={`/${tool.slug}`}
                  prefetch={false}
                  className={styles.card}
                  data-ph-capture-attribute-source="homepage-card"
                  data-ph-capture-attribute-tool-slug={tool.slug}
                >
                  <div className={styles.cardHeader}>
                    <ToolIcon slug={tool.slug} className={styles.cardIcon} />
                    <h3 className={styles.cardName}>{toolsT(`${tool.slug}.name`)}</h3>
                  </div>
                  <span className={styles.cardDesc}>{toolsT(`${tool.slug}.description`)}</span>
                </Link>
              </AnimatedItem>
            ))}
          </AnimatedGrid>
        </section>
      ))}
    </main>
  )
}
