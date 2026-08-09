import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { AdUnit } from '@/components/shared/AdUnit'
import { DraftBanner } from '@/components/shared/DraftBanner'
import { Callout } from '@/components/guides/Callout'
import { Figure } from '@/components/guides/Figure'
import { GuideJsonLd } from '@/components/guides/GuideJsonLd'
import { MdxA } from '@/components/guides/MdxA'
import { GuideToc } from '@/components/guides/GuideToc'
import { RelatedGuides } from '@/components/guides/RelatedGuides'
import { ToolCard } from '@/components/guides/ToolCard'
import { getGuide, getVisibleGuides } from '@/lib/guides/content'
import { formatGuideDate } from '@/lib/guides/format-date'
import { AUTHORS } from '@/lib/guides/types'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import styles from './page.module.css'

export const dynamicParams = false

export function generateStaticParams() {
  return getVisibleGuides('en').map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const guide = getGuide(slug, locale as Locale)
  if (!guide) return {}
  return {
    title: guide.title,
    description: guide.description,
    openGraph: { title: guide.title, description: guide.description },
    alternates: getAlternates(`/guides/${slug}`, locale as Locale),
  }
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const guide = getGuide(slug, locale as Locale)
  if (!guide) notFound()
  const t = await getTranslations('guides')
  const commonT = await getTranslations('common')
  const { default: Body } = await import(`@/content/guides/${slug}/${locale}.mdx`).catch(
    () => import(`@/content/guides/${slug}/en.mdx`)
  )
  const author = guide.author ? AUTHORS[guide.author] : undefined
  const updated = formatGuideDate(guide.updatedAt, locale)
  return (
    <div className={styles.outer}>
      <GuideJsonLd
        guide={guide}
        locale={locale}
        slug={slug}
        breadcrumbHome={commonT('breadcrumb.home')}
        breadcrumbGuides={commonT('nav.guides')}
      />
      <article className={styles.article}>
        {guide.status === 'draft' && <DraftBanner messageKey="guideBanner" />}
        <header>
          <h1>{guide.title}</h1>
          <p className={styles.meta}>
            {author && <span>{t('byLabel', { name: author.name })} · </span>}
            {t('readTime', { minutes: guide.readTimeMinutes })} · {t('updated', { date: updated })}
          </p>
          {guide.heroImage && (
            <Image
              src={guide.heroImage.src}
              alt={guide.heroImage.alt}
              width={1600}
              height={900}
              priority
              sizes="(max-width: 1023px) 100vw, 800px"
              className={styles.hero}
            />
          )}
        </header>
        <div className={styles.body}>
          <Body
            components={{
              Callout,
              Figure,
              ToolCard: (props: { slug: string }) => <ToolCard {...props} guideSlug={slug} />,
              // Raw markdown ![alt](src) routes through Figure (dimension-read
              // + next/image); markdown links get locale-aware routing.
              img: (props: { src?: string; alt?: string }) => (
                <Figure src={props.src ?? ''} alt={props.alt ?? ''} />
              ),
              a: MdxA,
              // Prose column is narrower than most tables; give each its own
              // scroll box so the article never scrolls sideways.
              table: (props: { children?: ReactNode }) => (
                <div className={styles.tableScroll}>
                  <table>{props.children}</table>
                </div>
              ),
            }}
          />
        </div>
        <AdUnit slot="" format="leaderboard" channel="guide_article_end" />
      </article>
      <aside className={styles.rail}>
        <GuideToc entries={guide.toc} />
        {guide.relatedTools.length > 0 && (
          <section className={styles.railSection}>
            <h2 className={styles.railHeading}>{t('relatedTools')}</h2>
            {guide.relatedTools.map((toolSlug) => (
              <ToolCard key={toolSlug} slug={toolSlug} guideSlug={slug} />
            ))}
          </section>
        )}
        <RelatedGuides slugs={guide.relatedGuides} locale={locale as Locale} />
        <AdUnit slot="" format="rectangle" channel="guide_sidebar" />
      </aside>
    </div>
  )
}
