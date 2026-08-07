export type GuideCategory = 'techniques' | 'gear' | 'editing'
export type GuideStatus = 'live' | 'draft'

export interface TocEntry {
  id: string
  text: string
  depth: 2 | 3
}

export interface GuideHeroImage {
  src: string
  alt: string
}

export interface GuideFrontmatter {
  title: string
  description: string
  category: GuideCategory
  tags?: string[]
  relatedTools: string[]
  relatedGuides?: string[]
  publishedAt: string
  updatedAt: string
  status: GuideStatus
  author?: string
  heroImage?: GuideHeroImage
  sourceRef?: string
}

export interface GuideLocaleFrontmatter {
  title: string
  description: string
  heroImageAlt?: string
  sourceHash: string
}

export interface GuideListItem {
  slug: string
  title: string
  description: string
  category: GuideCategory
  readTimeMinutes: number
  updatedAt: string
  heroImage?: GuideHeroImage
}

export interface Guide extends GuideListItem {
  publishedAt: string
  status: GuideStatus
  author?: string
  relatedTools: string[]
  relatedGuides: string[]
  toc: TocEntry[]
  body: string
}

export const AUTHORS: Record<string, { name: string }> = {
  'kevin-lee': { name: 'Kevin Lee' },
}
