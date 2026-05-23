'use client'

import { usePathname } from '@/lib/i18n/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { getToolBySlug } from '@/lib/data/tools'
import { getFaqsBySlug } from '@/lib/data/faq'

/**
 * Per-slug overrides for the SoftwareApplication JSON-LD. Tools not listed here
 * use the generic defaults (MultimediaApplication / Any / no featureList).
 * The analyzer needs a richer, AEO-tuned payload per spec §11.2 — explicit
 * "runs entirely in your browser, no upload" framing is the answer-engine hook.
 */
const SOFTWARE_APP_OVERRIDES: Record<
  string,
  { applicationCategory: string; operatingSystem: string; description: string; featureList: string[] }
> = {
  'lightroom-catalog-analyzer': {
    applicationCategory: 'PhotographyApplication',
    operatingSystem: 'Web Browser',
    description:
      'Free tool that analyzes a Lightroom Classic catalog (.lrcat) entirely in your browser — no upload, no account. It reads the catalog locally and reports gear usage, focal-length and aperture habits, ratings and pick rates, edit intensity, keyword coverage, GPS locations, shooting heatmaps, burst detection, and catalog health, with PDF, Markdown, and shareable-link exports.',
    featureList: [
      'Runs 100% in your browser — the catalog file is never uploaded',
      'Year-in-Review and year-to-year comparison',
      'Gear breakdown by camera body and lens over time',
      'Catalog-wide focal-length analysis with "one prime" recommendation',
      'Per-lens aperture sweet-spot histograms',
      'Time-of-day and shooting heatmap patterns',
      'Curation funnel and pick-rate analysis by gear',
      'Edit-intensity scoring from develop settings',
      'Keyword coverage and tagging blind spots',
      'GPS location clusters with privacy guards',
      'Burst detection and keeper-rate insight',
      'Catalog health: missing originals, broken paths, likely duplicates',
      'Export to PDF, Markdown, or a shareable URL',
    ],
  },
}

export function JsonLd() {
  const pathname = usePathname()
  const locale = useLocale()
  const toolsT = useTranslations('tools')
  const catT = useTranslations('common.nav.categories')
  const toolUIT = useTranslations('toolUI')
  const breadcrumbT = useTranslations('common.breadcrumb')

  if (!pathname) return null

  {
    const slug = pathname.slice(1) // remove leading /
    if (!slug || slug.includes('/')) return null
    const tool = getToolBySlug(slug)

    if (tool) {
      const translatedName = toolsT(`${slug}.name`)
      const translatedDesc = toolsT(`${slug}.description`)

      const override = SOFTWARE_APP_OVERRIDES[slug]

      const softwareApp = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: translatedName,
        description: override?.description ?? translatedDesc,
        applicationCategory: override?.applicationCategory ?? 'MultimediaApplication',
        operatingSystem: override?.operatingSystem ?? 'Any',
        inLanguage: locale,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        url: `https://www.phototools.io/${locale}/${tool.slug}`,
        ...(override?.featureList ? { featureList: override.featureList } : {}),
      }

      const breadcrumbs = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        inLanguage: locale,
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: breadcrumbT('home'),
            item: `https://www.phototools.io/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: catT(tool.category),
            item: `https://www.phototools.io/${locale}#${tool.category}`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: translatedName,
            item: `https://www.phototools.io/${locale}/${tool.slug}`,
          },
        ],
      }

      const faqs = getFaqsBySlug(slug)
      const faqJsonLd = faqs && faqs.questions.length > 0 ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: locale,
        mainEntity: faqs.questions.map((q) => ({
          '@type': 'Question',
          name: toolUIT(`${slug}.faq.${q.id}.question`),
          acceptedAnswer: {
            '@type': 'Answer',
            text: toolUIT(`${slug}.faq.${q.id}.answer`),
          },
        })),
      } : null

      return (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
          />
          {faqJsonLd && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
          )}
        </>
      )
    }
  }

  return null
}
