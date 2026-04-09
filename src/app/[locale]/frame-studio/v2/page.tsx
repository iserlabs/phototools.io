import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { getAlternates } from '@/lib/i18n/metadata'
import { FrameStudioV2 } from '../_components/v2/FrameStudioV2'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata.frame-studio')
  const title = `${t('title')} (v2)`
  const description = t('description')
  return {
    title,
    description,
    openGraph: { title, description },
    alternates: getAlternates('/frame-studio/v2'),
    robots: { index: false },
  }
}

export default function FrameStudioV2Page() {
  return <FrameStudioV2 />
}
