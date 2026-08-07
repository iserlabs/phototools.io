import { z } from 'zod'
import { getAllTools } from '@/lib/data/tools'

export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

const heroImageSchema = z.strictObject({
  src: z.string().startsWith('/images/guides/'),
  alt: z.string().min(1),
})

const toolSlug = z.string().superRefine((slug, ctx) => {
  if (!getAllTools().some((t) => t.slug === slug)) {
    ctx.addIssue({ code: 'custom', message: `unknown tool slug "${slug}" in relatedTools` })
  }
})

export const guideFrontmatterSchema = z.strictObject({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(['techniques', 'gear', 'editing']),
  tags: z.array(z.string().min(1)).optional(),
  relatedTools: z.array(toolSlug),
  relatedGuides: z.array(z.string().regex(SLUG_PATTERN)).optional(),
  publishedAt: isoDate,
  updatedAt: isoDate,
  status: z.enum(['live', 'draft']),
  author: z.string().optional(),
  heroImage: heroImageSchema.optional(),
  sourceRef: z.string().optional(),
})

export const localeFrontmatterSchema = z.strictObject({
  title: z.string().min(1),
  description: z.string().min(1),
  heroImageAlt: z.string().min(1).optional(),
  sourceHash: z.string().min(1),
})
