import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { getToolBySlug, getToolStatus } from '@/lib/data/tools'
import { MegapixelVisualizer } from './_components/MegapixelVisualizer'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.megapixels-size-visualizer')
  const title = t('title')
  const description = t('description')
  const tool = getToolBySlug('megapixels-size-visualizer')
  const isDraft = tool ? getToolStatus(tool) === 'draft' : false
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
    alternates: getAlternates('/megapixels-size-visualizer', locale as Locale),
    robots: isDraft ? { index: false, follow: true } : undefined,
  }
}

export default function MegapixelVisualizerPage() {
  return <MegapixelVisualizer />
}
