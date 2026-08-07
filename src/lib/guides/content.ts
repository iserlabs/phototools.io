import 'server-only'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { Locale } from '@/lib/i18n/routing'
import { getReadTimeMinutes } from './read-time'
import { guideFrontmatterSchema, localeFrontmatterSchema, SLUG_PATTERN } from './schema'
import { extractToc } from './toc'
import type { Guide, GuideFrontmatter, GuideListItem } from './types'

export const GUIDES_CONTENT_DIR = path.join(process.cwd(), 'src/content/guides')

function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function getAllGuideSlugs(contentDir: string = GUIDES_CONTENT_DIR): string[] {
  if (!existsSync(contentDir)) return []
  return readdirSync(contentDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && SLUG_PATTERN.test(e.name))
    .map((e) => e.name)
}

/**
 * gray-matter's default YAML engine (js-yaml core schema) auto-parses
 * unquoted `YYYY-MM-DD` scalars into JS `Date` objects, but our frontmatter
 * schemas expect plain ISO date strings. js-yaml resolves a bare date to UTC
 * midnight, so slicing the ISO string round-trips it losslessly back to
 * `YYYY-MM-DD` without needing a custom YAML engine/dependency.
 */
function normalizeYamlDates(data: object): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...data }
  for (const [key, value] of Object.entries(normalized)) {
    if (value instanceof Date) normalized[key] = value.toISOString().slice(0, 10)
  }
  return normalized
}

type LocaleFileData = { title: string; description: string; heroImageAlt?: string; body: string }

function readEnFrontmatter(slug: string, contentDir: string): { fm: GuideFrontmatter; body: string } {
  const raw = readFileSync(path.join(contentDir, slug, 'en.mdx'), 'utf8')
  const { data, content } = matter(raw)
  return { fm: guideFrontmatterSchema.parse(normalizeYamlDates(data)), body: content }
}

function readLocaleFile(slug: string, locale: Locale, contentDir: string): LocaleFileData | null {
  const file = path.join(contentDir, slug, `${locale}.mdx`)
  if (!existsSync(file)) return null
  const { data, content } = matter(readFileSync(file, 'utf8'))
  const fm = localeFrontmatterSchema.parse(normalizeYamlDates(data))
  return { title: fm.title, description: fm.description, heroImageAlt: fm.heroImageAlt, body: content }
}

/**
 * Resolves the locale file for non-en locales without a redundant disk read.
 * Reachable-`null` case is only hit for dev drafts — the parity check forbids
 * live guides with missing locale files.
 */
function resolveLocaleFile(slug: string, locale: Locale, contentDir: string): LocaleFileData | null {
  return locale === 'en' ? null : readLocaleFile(slug, locale, contentDir)
}

function isVisible(fm: GuideFrontmatter): boolean {
  return fm.status === 'live' || isDev()
}

/** Builds a list item from already-read frontmatter/body — never touches disk. */
function toListItem(
  slug: string,
  fm: GuideFrontmatter,
  locale: Locale,
  enBody: string,
  loc: LocaleFileData | null
): GuideListItem {
  const body = loc?.body ?? enBody
  const heroImage = fm.heroImage
    ? { src: fm.heroImage.src, alt: loc?.heroImageAlt ?? fm.heroImage.alt }
    : undefined
  return {
    slug,
    title: loc?.title ?? fm.title,
    description: loc?.description ?? fm.description,
    category: fm.category,
    readTimeMinutes: getReadTimeMinutes(body, locale),
    updatedAt: fm.updatedAt,
    heroImage,
  }
}

function visibleEntries(contentDir: string): Array<{ slug: string; fm: GuideFrontmatter; enBody: string }> {
  return getAllGuideSlugs(contentDir)
    .map((slug) => {
      const { fm, body } = readEnFrontmatter(slug, contentDir)
      return { slug, fm, enBody: body }
    })
    .filter(({ fm }) => isVisible(fm))
    .sort((a, b) => b.fm.publishedAt.localeCompare(a.fm.publishedAt))
}

export function getVisibleGuides(locale: Locale, contentDir: string = GUIDES_CONTENT_DIR): GuideListItem[] {
  return visibleEntries(contentDir).map(({ slug, fm, enBody }) =>
    toListItem(slug, fm, locale, enBody, resolveLocaleFile(slug, locale, contentDir))
  )
}

export function getLiveGuides(locale: Locale, contentDir: string = GUIDES_CONTENT_DIR): GuideListItem[] {
  return visibleEntries(contentDir)
    .filter(({ fm }) => fm.status === 'live')
    .map(({ slug, fm, enBody }) => toListItem(slug, fm, locale, enBody, resolveLocaleFile(slug, locale, contentDir)))
}

export function hasVisibleGuides(contentDir: string = GUIDES_CONTENT_DIR): boolean {
  return visibleEntries(contentDir).length > 0
}

export function getGuide(slug: string, locale: Locale, contentDir: string = GUIDES_CONTENT_DIR): Guide | null {
  if (!getAllGuideSlugs(contentDir).includes(slug)) return null
  const { fm, body: enBody } = readEnFrontmatter(slug, contentDir)
  if (!isVisible(fm)) return null
  const loc = resolveLocaleFile(slug, locale, contentDir)
  const body = loc?.body ?? enBody
  const item = toListItem(slug, fm, locale, enBody, loc)
  return {
    ...item,
    publishedAt: fm.publishedAt,
    status: fm.status,
    author: fm.author,
    relatedTools: fm.relatedTools,
    relatedGuides: fm.relatedGuides ?? [],
    toc: extractToc(body),
    body,
  }
}

export function getGuidesForTool(
  toolSlug: string,
  locale: Locale,
  contentDir: string = GUIDES_CONTENT_DIR
): Array<{ slug: string; title: string }> {
  return visibleEntries(contentDir)
    .filter(({ fm }) => fm.status === 'live' && fm.relatedTools.includes(toolSlug))
    .map(({ slug, fm }) => ({ slug, title: resolveLocaleFile(slug, locale, contentDir)?.title ?? fm.title }))
}
