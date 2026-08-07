import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkGuides, computeSourceHash } from './check-guide-translations.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__', 'guide-translations')
const CONTENT = path.join(ROOT, 'content')
const MESSAGES = path.join(ROOT, 'messages')

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
})
