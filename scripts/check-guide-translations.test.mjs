import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkGuides, computeSourceHash } from './check-guide-translations.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'guide-translations')
const CONTENT = path.join(ROOT, 'content')
const MESSAGES = path.join(ROOT, 'messages')
const CONTENT_NO_LIVE = path.join(ROOT, 'content-no-live')
const MESSAGES_EMPTY_CHROME = path.join(ROOT, 'messages-empty-chrome')

describe('checkGuides', () => {
  it('passes a complete live guide and a draft without siblings', () => {
    const { errors } = checkGuides(CONTENT, MESSAGES)
    const relevant = errors.filter((e) => e.includes('good-live') || e.includes('draft-only-en'))
    expect(relevant).toEqual([])
  })
  it('errors on missing locale file for a live guide', () => {
    const { errors } = checkGuides(CONTENT, MESSAGES)
    expect(errors.some((e) => e.includes('bad-live') && e.includes('ja.mdx'))).toBe(true)
  })
  it('errors on illegal frontmatter keys in a locale file', () => {
    const { errors } = checkGuides(CONTENT, MESSAGES)
    expect(errors.some((e) => e.includes('bad-live') && e.includes('category'))).toBe(true)
  })
  it('errors on component-tag mismatch and names the differing tag signature', () => {
    const { errors } = checkGuides(CONTENT, MESSAGES)
    // bad-live/es.mdx drops the <Callout type="tip"> that en.mdx has, so the
    // error must name that specific signature, not just say "mismatch".
    expect(
      errors.some((e) => e.includes('bad-live') && e.includes('missing vs en') && e.includes('Callout(type=tip)'))
    ).toBe(true)
  })
  it('diffs tags as a multiset so a duplicate signature is not lost to Set membership', () => {
    // dup-live/en.mdx has <Callout type="tip"> TWICE; es.mdx has it once.
    // A naive Set-based diff would see the signature present on both sides
    // and report empty brackets even though the mismatch fired.
    const { errors } = checkGuides(CONTENT, MESSAGES)
    const msg = errors.find((e) => e.includes('dup-live') && e.includes('es.mdx'))
    expect(msg).toBeDefined()
    expect(msg).toContain('missing vs en: [Callout(type=tip)]')
    expect(msg).not.toContain('missing vs en: []')
  })
  it('warns (not errors) on stale sourceHash', () => {
    const { errors, warnings } = checkGuides(CONTENT, MESSAGES)
    expect(warnings.some((w) => w.includes('good-live') && w.includes('ja.mdx'))).toBe(true)
    expect(errors.some((e) => e.includes('stale'))).toBe(false)
  })
  it('computeSourceHash is stable and 12 hex chars', () => {
    const h = computeSourceHash('---\ntitle: T\ndescription: D\n---\nbody')
    expect(h).toMatch(/^[0-9a-f]{12}$/)
    expect(computeSourceHash('---\ntitle: T\ndescription: D\n---\nbody')).toBe(h)
  })
  it('has no empty-chrome errors when the locale chrome files are fully populated', () => {
    // CONTENT has live guides (good-live/bad-live/dup-live), and the
    // baseline MESSAGES fixture now carries non-empty guides.json/
    // common.json/metadata.json chrome content for es and ja.
    const { errors } = checkGuides(CONTENT, MESSAGES)
    expect(errors.some((e) => e.includes('empty chrome key'))).toBe(false)
  })
})

describe('checkGuides — locale chrome gate for live guides', () => {
  it('errors on an empty leaf in <locale>/guides.json when a guide is live', () => {
    const { errors } = checkGuides(CONTENT, MESSAGES_EMPTY_CHROME)
    // ja/guides.json has categories.techniques.name blanked out.
    expect(
      errors.some(
        (e) => e.includes('ja/guides.json') && e.includes('empty chrome key') && e.includes('guides.categories.techniques.name')
      )
    ).toBe(true)
  })
  it('errors on an empty required key in <locale>/common.json when a guide is live', () => {
    const { errors } = checkGuides(CONTENT, MESSAGES_EMPTY_CHROME)
    // es/common.json has nav.guides blanked out.
    expect(
      errors.some(
        (e) => e.includes('es/common.json') && e.includes('empty chrome key') && e.includes('common.nav.guides')
      )
    ).toBe(true)
  })
  it('errors on an empty required key in <locale>/metadata.json when a guide is live', () => {
    const { errors } = checkGuides(CONTENT, MESSAGES_EMPTY_CHROME)
    // ja/metadata.json has guides.description blanked out.
    expect(
      errors.some(
        (e) =>
          e.includes('ja/metadata.json') && e.includes('empty chrome key') && e.includes('metadata.guides.description')
      )
    ).toBe(true)
  })
  it('skips the chrome check entirely when there are zero live guides (current real-content state)', () => {
    // CONTENT_NO_LIVE has only a draft guide; paired with the SAME
    // empty-chrome messages fixture that fails above, this proves the gate
    // is keyed on "at least one live guide" and not just "chrome present".
    const { errors } = checkGuides(CONTENT_NO_LIVE, MESSAGES_EMPTY_CHROME)
    expect(errors.some((e) => e.includes('empty chrome key'))).toBe(false)
  })
})
