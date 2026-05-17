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
 * registry directly from TypeScript source via `tsx` is overkill — instead we
 * parse `src/lib/data/tools.ts` for the static array.
 *
 * Spec: https://llmstxt.org/
 */
import fs from 'node:fs/promises'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dirname, '..')
const TOOLS_FILE = path.join(REPO_ROOT, 'src/lib/data/tools.ts')
const OUTPUT_FILE = path.join(REPO_ROOT, 'public/llms.txt')
const BASE_URL = 'https://www.phototools.io'

async function parseLiveTools() {
  const source = await fs.readFile(TOOLS_FILE, 'utf-8')
  // Match each tool entry: { slug: '...', name: '...', description: '...', dev: '...', prod: '...', category: '...' }
  const regex = /\{\s*slug:\s*'([^']+)',\s*name:\s*'([^']+)',\s*description:\s*'([^']+)',\s*dev:\s*'([^']+)',\s*prod:\s*'([^']+)',/g
  const tools = []
  let m
  while ((m = regex.exec(source)) !== null) {
    const [, slug, name, description, , prod] = m
    if (prod === 'live') tools.push({ slug, name, description })
  }
  return tools
}

function buildLlmsTxt(tools) {
  return [
    '# PhotoTools',
    '',
    '> Free interactive photography calculators, simulators, and references. No accounts, no signup, no paywalls. All tools run client-side where possible.',
    '',
    '## About',
    '',
    'PhotoTools provides educational tools for photographers covering field of view, depth of field, exposure, focal length equivalence, sensor sizes, white balance, color schemes, star trails, focus stacking, megapixels-to-print, EXIF inspection, and framing. Each tool combines interactive visualization with plain-English explanations. Localized in 31 languages.',
    '',
    '## Tools',
    '',
    ...tools.map((t) => `- [${t.name}](${BASE_URL}/en/${t.slug}): ${t.description}`),
    '',
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
