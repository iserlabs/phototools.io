import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// LIMITATION: Vercel WAF rate-limit rules run at the edge and are not present
// in front of `npm run start`. Sending 11 rapid POSTs locally would create 11
// real shares (or return 11 × 503 without a Blob token), never a 429 — so the
// rate limit itself cannot be exercised in this environment. We instead verify
// the three rule definitions are documented in the checked-in config so the
// manual dashboard entry stays reviewable and in-sync. The 429 → user-facing
// "rate-limited" message path is covered by the share-client unit test
// (Task 21.1) and the ShareDisclosureModal error rendering (Task 21.2).
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../..')

test.describe('Lightroom Catalog Analyzer — WAF config presence', () => {
  test('documents all three WAF rate-limit rules', () => {
    const doc = readFileSync(path.join(REPO_ROOT, 'docs/vercel-waf-rules.md'), 'utf8')
    expect(doc).toContain('lrcat-share-create')
    expect(doc).toContain('10 / hour / IP')
    expect(doc).toContain('lrcat-share-read')
    expect(doc).toContain('200 / hour / IP')
    expect(doc).toContain('lrcat-share-og')
    expect(doc).toContain('2000 / hour / IP')
  })

  test('registers the expire-shares cron in vercel.json', () => {
    const vercelJson = JSON.parse(readFileSync(path.join(REPO_ROOT, 'vercel.json'), 'utf8'))
    const cron = (vercelJson.crons ?? []).find((c: { path: string }) => c.path === '/api/cron/expire-shares')
    expect(cron).toBeTruthy()
    expect(cron.schedule).toBe('0 3 * * *')
  })
})
