import { describe, expect, it } from 'vitest'
import { extractToc } from './toc'

describe('extractToc', () => {
  it('extracts h2 and h3, skips h1 and h4', () => {
    const body = '# Title\n\n## Setup\n\ntext\n\n### Lighting\n\n#### Deep\n\n## Shooting\n'
    expect(extractToc(body)).toEqual([
      { id: 'setup', text: 'Setup', depth: 2 },
      { id: 'lighting', text: 'Lighting', depth: 3 },
      { id: 'shooting', text: 'Shooting', depth: 2 },
    ])
  })
  it('dedupes ids like rehype-slug (github-slugger counters)', () => {
    const body = '## Setup\n\n## Setup\n'
    expect(extractToc(body).map((e) => e.id)).toEqual(['setup', 'setup-1'])
  })
  it('handles MDX with JSX blocks without crashing', () => {
    const body = '## Intro\n\n<Callout type="tip">Use a tripod.</Callout>\n\n## Gear\n'
    expect(extractToc(body).map((e) => e.text)).toEqual(['Intro', 'Gear'])
  })
  it('flattens inline markup inside headings', () => {
    const body = '## Using `f/8` and *beyond*\n'
    expect(extractToc(body)[0].text).toBe('Using f/8 and beyond')
  })
})
