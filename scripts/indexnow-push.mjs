#!/usr/bin/env node
/**
 * IndexNow push — submit canonical URLs to Bing/DDG/Yandex/Naver after deploy.
 *
 * Bing-ecosystem search drives 4-5× more traffic to phototools.io than Google
 * per Apr-May 2026 PostHog referrer data, and IndexNow indexes new pages in
 * minutes vs days. Google ignores IndexNow but Google's not the bottleneck.
 *
 * Usage:
 *   INDEXNOW_KEY=<key> node scripts/indexnow-push.mjs
 *   INDEXNOW_KEY=<key> INDEXNOW_HOST=staging.example.com node scripts/indexnow-push.mjs
 *
 * Env:
 *   INDEXNOW_KEY  — required, the key string (NOT the filename). Matches
 *                   the basename of public/<key>.txt which IndexNow fetches
 *                   to verify ownership.
 *   INDEXNOW_HOST — optional, defaults to www.phototools.io.
 */

const HOST = process.env.INDEXNOW_HOST || 'www.phototools.io'
const KEY = process.env.INDEXNOW_KEY
const ENDPOINT = 'https://api.indexnow.org/indexnow'
const MAX_URLS_PER_REQUEST = 10000

// Gate to production-only. Preview and local builds are no-ops even if KEY is set.
const VERCEL_ENV = process.env.VERCEL_ENV
const FORCE = process.env.INDEXNOW_FORCE === '1'
if (VERCEL_ENV && VERCEL_ENV !== 'production' && !FORCE) {
  console.log(`Skipping IndexNow push (VERCEL_ENV=${VERCEL_ENV}, not production)`)
  process.exit(0)
}

if (!KEY) {
  console.error('INDEXNOW_KEY env var is required')
  process.exit(1)
}

async function main() {
  const sitemapUrl = `https://${HOST}/sitemap.xml`
  console.log(`Fetching sitemap: ${sitemapUrl}`)
  const sitemapRes = await fetch(sitemapUrl)
  if (!sitemapRes.ok) {
    console.error(`Sitemap fetch failed: ${sitemapRes.status} ${sitemapRes.statusText}`)
    process.exit(1)
  }
  const sitemap = await sitemapRes.text()
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  if (urls.length === 0) {
    console.error('No <loc> entries parsed from sitemap')
    process.exit(1)
  }
  console.log(`Parsed ${urls.length} URLs from sitemap`)

  const body = {
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls.slice(0, MAX_URLS_PER_REQUEST),
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  })

  const text = await res.text().catch(() => '')
  console.log(`IndexNow response: ${res.status} ${res.statusText}`)
  if (text) console.log(`Body: ${text}`)

  // 200 = first-time success, 202 = accepted (subsequent), 422 = URL list issues
  if (res.status !== 200 && res.status !== 202) {
    console.error('IndexNow submission failed')
    process.exit(1)
  }
  console.log(`Submitted ${body.urlList.length} URLs for indexing`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
