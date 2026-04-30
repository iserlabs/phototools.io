import { Link } from '@/lib/i18n/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getVisibleTools, getToolStatus } from '@/lib/data/tools'
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
  const tools = getVisibleTools()

  const grouped = CATEGORY_KEYS
    .map((key) => ({
      key,
      label: t(`categories.${key}`),
      tools: tools
        .filter((tool) => tool.category === key)
        .sort((a, b) => {
          const aLive = getToolStatus(a) === 'live' ? 0 : 1
          const bLive = getToolStatus(b) === 'live' ? 0 : 1
          return aLive - bLive
        }),
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
            {group.tools.map((tool, idx) => {
              const isLive = getToolStatus(tool) === 'live'
              if (isLive) {
                return (
                  <AnimatedItem key={tool.slug} index={idx}>
                    {/* prefetch={false}: the homepage lists every tool as a
                        card. Default prefetch causes Next.js to emit
                        <link rel="preload" as="style"> for each tool's unique
                        CSS chunk (e.g. StarTrailCalculator, SensorSize,
                        PhotoUploadPanel), firing "preloaded but not used"
                        console warnings for anything the user doesn't click.
                        Tools that share layout chunks aren't affected either
                        way, so disabling prefetch here loses nothing for
                        most routes and cleans the console. */}
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
                )
              }
              return (
                <AnimatedItem key={tool.slug} index={idx}>
                  <div className={`${styles.card} ${styles.cardDisabled}`}>
                    <div className={styles.cardHeader}>
                      <ToolIcon slug={tool.slug} className={styles.cardIcon} />
                      <h3 className={styles.cardName}>{toolsT(`${tool.slug}.name`)}</h3>
                      <span className={styles.cardBadge}>{t('comingSoon')}</span>
                    </div>
                    <span className={styles.cardDesc}>{toolsT(`${tool.slug}.description`)}</span>
                  </div>
                </AnimatedItem>
              )
            })}
          </AnimatedGrid>
        </section>
      ))}
    </main>
  )
}
