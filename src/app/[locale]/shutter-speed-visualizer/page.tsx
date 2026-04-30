import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { ShutterSpeedGuide } from './_components/ShutterSpeedGuide'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.shutter-speed-visualizer')
  return { title: t('title'), description: t('description'), alternates: getAlternates('/shutter-speed-visualizer', locale as Locale) }
}

export default function ShutterSpeedVisualizerPage() {
  return <ShutterSpeedGuide />
}
