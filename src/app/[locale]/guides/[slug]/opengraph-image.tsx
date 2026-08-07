import { getTranslations } from 'next-intl/server'
import { generateGuideOgImage } from '@/lib/og'
import { getGuide } from '@/lib/guides/content'
import type { Locale } from '@/lib/i18n/routing'

export const alt = 'PhotoTools'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  const guide = getGuide(slug, locale as Locale)
  if (!guide) return new Response('Not Found', { status: 404 })
  const t = await getTranslations({ locale, namespace: 'guides' })
  return generateGuideOgImage({ title: guide.title, categoryLabel: t(`categories.${guide.category}.name`) })
}
