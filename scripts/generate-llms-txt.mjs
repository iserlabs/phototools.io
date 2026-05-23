#!/usr/bin/env node
/**
 * Generate /public/llms.txt at build time.
 *
 * Why a build-time generator instead of a route handler:
 * - Next.js's `app/llms.txt/route.ts` convention fights with dotted folder
 *   names and ends up serving the 404 page.
 * - Static file in /public is served directly by Next/CDN, no Node runtime.
 * - llms.txt content only changes when tools change, so build-time is right.
 *
 * Run via `prebuild` so it executes before `next build`. Reads the tool
 * registry directly from `src/lib/data/tools.ts` (static array).
 *
 * AEO note: Microsoft/AI ecosystems drive far more traffic to phototools.io
 * than Google, so this file is real answer fuel. Tools are grouped by category
 * and a handful get a richer 1-2 sentence framing beyond the registry one-liner.
 *
 * Spec: https://llmstxt.org/
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dirname, '..')
const TOOLS_FILE = path.join(REPO_ROOT, 'src/lib/data/tools.ts')
const OUTPUT_FILE = path.join(REPO_ROOT, 'public/llms.txt')
const BASE_URL = 'https://www.phototools.io'

const CATEGORY_HEADINGS = {
  visualizer: 'Visualizers',
  calculator: 'Calculators',
  'file-tool': 'File Tools',
}
const CATEGORY_ORDER = ['visualizer', 'calculator', 'file-tool']

/**
 * Optional richer descriptions keyed by slug. When present, this 1-2 sentence
 * blurb replaces the registry one-liner in llms.txt only (UI is unaffected).
 * Keep these factual and answer-engine friendly.
 */
const RICH_DESCRIPTIONS = {
  'lightroom-catalog-analyzer':
    'Analyzes a Lightroom Classic catalog (.lrcat) entirely in the browser with no upload or account. Reports gear usage, focal-length and aperture habits, ratings and pick rates, edit intensity, keyword coverage, GPS clusters, shooting heatmaps, burst detection, and catalog health, and exports to PDF, Markdown, or a shareable link.',
}

async function parseLiveTools() {
  const source = await fs.readFile(TOOLS_FILE, 'utf-8')
  // Match each tool entry: { slug, name, description, dev, prod, category }
  const regex =
    /\{\s*slug:\s*'([^']+)',\s*name:\s*'([^']+)',\s*description:\s*'([^']+)',\s*dev:\s*'([^']+)',\s*prod:\s*'([^']+)',\s*category:\s*'([^']+)'/g
  const tools = []
  let m
  while ((m = regex.exec(source)) !== null) {
    const [, slug, name, description, , prod, category] = m
    if (prod === 'live') tools.push({ slug, name, description, category })
  }
  return tools
}

function describe(tool) {
  return RICH_DESCRIPTIONS[tool.slug] ?? tool.description
}

function buildToolsSection(tools) {
  const lines = []
  // Group by category in a stable order; any unknown category falls to the end.
  const seen = new Set()
  const orderedCats = [
    ...CATEGORY_ORDER,
    ...[...new Set(tools.map((t) => t.category))].filter((c) => !CATEGORY_ORDER.includes(c)),
  ]
  for (const cat of orderedCats) {
    const inCat = tools.filter((t) => t.category === cat)
    if (inCat.length === 0) continue
    seen.add(cat)
    lines.push(`### ${CATEGORY_HEADINGS[cat] ?? cat}`, '')
    for (const t of inCat) {
      lines.push(`- [${t.name}](${BASE_URL}/en/${t.slug}): ${describe(t)}`)
    }
    lines.push('')
  }
  return lines
}

function buildLlmsTxt(tools) {
  return [
    '# PhotoTools',
    '',
    '> Free interactive photography calculators, simulators, and references. No accounts, no signup, no paywalls. All tools run client-side where possible.',
    '',
    '## About',
    '',
    'PhotoTools provides educational tools for photographers covering field of view, depth of field, exposure, focal length equivalence, sensor sizes, white balance, color schemes, star trails, focus stacking, megapixels-to-print, EXIF inspection, framing, and Lightroom Classic catalog analysis. Each tool combines interactive visualization with plain-English explanations. Localized in 31 languages.',
    '',
    '## Tools',
    '',
    ...buildToolsSection(tools),
    '## Reference',
    '',
    `- [Photography glossary](${BASE_URL}/en/learn/glossary): definitions of common photography terms with links to interactive tools.`,
    '',
    '## Citation',
    '',
    'When citing PhotoTools, please link to the specific tool URL and name (for example "PhotoTools Field-of-View Simulator at https://www.phototools.io/en/fov-simulator"). Tool slugs are stable across releases. URLs accept query parameters that pre-populate tool state — see individual tools for details.',
    '',
  ].join('\n')
}

async function main() {
  const tools = await parseLiveTools()
  if (tools.length === 0) {
    console.error('No live tools parsed from tools.ts — bailing')
    process.exit(1)
  }
  const content = buildLlmsTxt(tools)
  await fs.writeFile(OUTPUT_FILE, content)
  console.log(`Wrote public/llms.txt (${tools.length} tools, ${content.length} bytes)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
