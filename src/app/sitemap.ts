import { type MetadataRoute } from 'next'
import { getLiveTools } from '@/lib/data/tools'
import { locales, defaultLocale } from '@/lib/i18n/routing'

// Update this date when tools are added or site content changes significantly
const LAST_CONTENT_UPDATE = new Date('2026-04-05')

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.phototools.io'

  const staticPaths = [
    { path: '', changeFrequency: 'weekly' as const, priority: 1 },
    { path: '/learn/glossary', changeFrequency: 'monthly' as const, priority: 0.8 },
    { path: '/about', changeFrequency: 'yearly' as const, priority: 0.5 },
    { path: '/contact', changeFrequency: 'yearly' as const, priority: 0.4 },
    { path: '/privacy', changeFrequency: 'yearly' as const, priority: 0.3 },
    { path: '/terms', changeFrequency: 'yearly' as const, priority: 0.3 },
  ]

  const tools = getLiveTools()
  const toolPaths = tools.map((tool) => ({
    path: `/${tool.slug}`,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }))

  const allPaths = [...staticPaths, ...toolPaths]

  return allPaths.flatMap(({ path, changeFrequency, priority }) =>
    locales.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: LAST_CONTENT_UPDATE,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries([
          ...locales.map((l) => [l, `${baseUrl}/${l}${path}`]),
          ['x-default', `${baseUrl}/${defaultLocale}${path}`],
        ]),
      },
    }))
  )
}
