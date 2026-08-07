import { type MetadataRoute } from 'next'
import { getLiveTools } from '@/lib/data/tools'
import { getLiveGuides } from '@/lib/guides/content'
import { locales, defaultLocale } from '@/lib/i18n/routing'

// Update this date when tools are added or site content changes significantly
const LAST_CONTENT_UPDATE = new Date('2026-05-08')

type SitemapPathEntry = {
  path: string
  changeFrequency: 'weekly' | 'monthly' | 'yearly'
  priority: number
  lastModified?: Date
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.phototools.io'

  const staticPaths: SitemapPathEntry[] = [
    { path: '', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/learn/glossary', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/about', changeFrequency: 'yearly' as const, priority: 0.5 },
    { path: '/contact', changeFrequency: 'yearly' as const, priority: 0.4 },
    { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3 },
  ]

  const tools = getLiveTools()
  const toolPaths: SitemapPathEntry[] = tools.map((tool) => ({
    path: `/${tool.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  const liveGuides = getLiveGuides('en')
  const guidePaths: SitemapPathEntry[] =
    liveGuides.length > 0
      ? [
          { path: '/guides', changeFrequency: 'weekly' as const, priority: 0.8 },
          ...liveGuides.map((g) => ({
            path: `/guides/${g.slug}`,
            changeFrequency: 'monthly' as const,
            priority: 0.7,
            lastModified: new Date(g.updatedAt),
          })),
        ]
      : []

  const allPaths: SitemapPathEntry[] = [...staticPaths, ...toolPaths, ...guidePaths]

  return allPaths.flatMap((pathEntry) => {
    const { path, changeFrequency, priority, lastModified } = pathEntry
    return locales.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: lastModified ?? LAST_CONTENT_UPDATE,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries([
          ...locales.map((l) => [l, `${baseUrl}/${l}${path}`]),
          ['x-default', `${baseUrl}/${defaultLocale}${path}`],
        ]),
      },
    }))
  })
}
