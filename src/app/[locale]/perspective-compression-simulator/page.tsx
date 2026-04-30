import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import type { Locale } from '@/lib/i18n/routing'
import { PerspectiveCompressionSimulator } from './_components/PerspectiveCompressionSimulator'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations('metadata.perspective-compression-simulator')
  return { title: t('title'), description: t('description'), alternates: getAlternates('/perspective-compression-simulator', locale as Locale) }
}

export default function PerspectiveCompressionSimulatorPage() {
  return <PerspectiveCompressionSimulator />
}
