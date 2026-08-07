import type { Guide } from '@/lib/guides/types'
import { AUTHORS } from '@/lib/guides/types'

const BASE_URL = 'https://www.phototools.io'

interface GuideJsonLdProps {
  guide: Guide
  locale: string
  slug: string
  breadcrumbHome: string
  breadcrumbGuides: string
}

export function GuideJsonLd({ guide, locale, slug, breadcrumbHome, breadcrumbGuides }: GuideJsonLdProps) {
  const author = guide.author && AUTHORS[guide.author]
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    inLanguage: locale,
    datePublished: guide.publishedAt,
    dateModified: guide.updatedAt,
    ...(guide.heroImage ? { image: `${BASE_URL}${guide.heroImage.src}` } : {}),
    author: author
      ? { '@type': 'Person', name: author.name }
      : { '@type': 'Organization', name: 'PhotoTools' },
  }
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: breadcrumbHome, item: `${BASE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: breadcrumbGuides, item: `${BASE_URL}/${locale}/guides` },
      { '@type': 'ListItem', position: 3, name: guide.title, item: `${BASE_URL}/${locale}/guides/${slug}` },
    ],
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
    </>
  )
}
