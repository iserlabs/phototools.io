import { Suspense } from 'react'
import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { getToolBySlug, getToolStatus } from '@/lib/data/tools'
import { LightroomCatalogAnalyzer } from './_components/analyzer/LightroomCatalogAnalyzer'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('tools')
  const name = t('lightroom-catalog-analyzer.name')
  const description = t('lightroom-catalog-analyzer.description')
  // m-11: draft tools are NOT noindexed globally — each page must opt in.
  const tool = getToolBySlug('lightroom-catalog-analyzer')
  const isDraft = tool ? getToolStatus(tool) === 'draft' : false
  return {
    title: name,
    description,
    openGraph: { title: name, description },
    alternates: getAlternates('/lightroom-catalog-analyzer', locale as Locale),
    robots: isDraft ? { index: false, follow: true } : undefined,
  }
}

export default async function LightroomCatalogAnalyzerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  // LightroomCatalogAnalyzer reads useSearchParams() for the ?demo=true autoload,
  // which requires a Suspense boundary for static prerender (CSR bailout).
  return (
    <Suspense>
      <LightroomCatalogAnalyzer />
    </Suspense>
  )
}
