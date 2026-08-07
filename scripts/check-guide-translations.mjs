// Guide translation parity checker.
// Hard failures (exit 1): live guide missing locale files, illegal locale
// frontmatter keys, missing required locale keys, component-tag mismatch.
// Warnings (exit 0): stale sourceHash — refresh before the next publish wave.
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import matter from 'gray-matter'

const ALLOWED_LOCALE_KEYS = new Set(['title', 'description', 'heroImageAlt', 'sourceHash'])
const REQUIRED_LOCALE_KEYS = ['title', 'description', 'sourceHash']
const TAG_PATTERN = /<([A-Z][A-Za-z0-9]*)\b([^>]*?)\/?>/g
const STRUCTURAL_ATTRS = ['src', 'slug', 'type']

export function computeSourceHash(enRaw) {
  const { data, content } = matter(enRaw)
  const basis = [content, data.title ?? '', data.description ?? '', data.heroImage?.alt ?? ''].join('\n')
  return createHash('sha256').update(basis).digest('hex').slice(0, 12)
}

function componentSignature(body) {
  const tags = []
  for (const m of body.matchAll(TAG_PATTERN)) {
    const attrs = STRUCTURAL_ATTRS.map((a) => {
      const found = m[2].match(new RegExp(`${a}="([^"]*)"`))
      return found ? `${a}=${found[1]}` : null
    }).filter(Boolean)
    tags.push(`${m[1]}(${attrs.join(',')})`)
  }
  return tags.sort().join('|')
}

export function checkGuides(contentDir, messagesDir) {
  const errors = []
  const warnings = []
  const locales = readdirSync(messagesDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((l) => l !== 'en')
  if (!existsSync(contentDir)) return { errors, warnings }

  for (const slug of readdirSync(contentDir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)) {
    const enPath = path.join(contentDir, slug, 'en.mdx')
    if (!existsSync(enPath)) {
      errors.push(`${slug}: missing en.mdx`)
      continue
    }
    const enRaw = readFileSync(enPath, 'utf8')
    const en = matter(enRaw)
    const expectedHash = computeSourceHash(enRaw)
    const enSignature = componentSignature(en.content)
    if (en.data.status !== 'live') continue

    for (const locale of locales) {
      const file = path.join(contentDir, slug, `${locale}.mdx`)
      if (!existsSync(file)) {
        errors.push(`${slug}: live guide missing ${locale}.mdx`)
        continue
      }
      const loc = matter(readFileSync(file, 'utf8'))
      for (const key of Object.keys(loc.data)) {
        if (!ALLOWED_LOCALE_KEYS.has(key)) errors.push(`${slug}/${locale}.mdx: illegal frontmatter key "${key}"`)
      }
      for (const key of REQUIRED_LOCALE_KEYS) {
        if (!loc.data[key]) errors.push(`${slug}/${locale}.mdx: missing required key "${key}"`)
      }
      const locSignature = componentSignature(loc.content)
      if (locSignature !== enSignature) {
        errors.push(
          `${slug}/${locale}.mdx: component-tag mismatch (Callout/Figure/ToolCard set or structural attrs differ from en.mdx)`
        )
      }
      if (loc.data.sourceHash && loc.data.sourceHash !== expectedHash) {
        warnings.push(`${slug}/${locale}.mdx: stale translation (sourceHash ${loc.data.sourceHash} != ${expectedHash})`)
      }
    }
  }
  return { errors, warnings }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) {
  const { errors, warnings } = checkGuides('src/content/guides', 'src/lib/i18n/messages')
  for (const w of warnings) console.warn(`WARN  ${w}`)
  for (const e of errors) console.error(`ERROR ${e}`)
  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s), ${warnings.length} warning(s).`)
    process.exit(1)
  }
  console.log(`Guide translations OK — ${warnings.length} warning(s).`)
}
