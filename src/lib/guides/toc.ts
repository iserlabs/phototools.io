import GithubSlugger from 'github-slugger'
import type { Heading } from 'mdast'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import type { TocEntry } from './types'

function headingText(node: Heading): string {
  let text = ''
  visit(node, ['text', 'inlineCode'], (child) => {
    text += (child as { value: string }).value
  })
  return text
}

export function extractToc(body: string): TocEntry[] {
  const tree = unified().use(remarkParse).use(remarkMdx).parse(body)
  const slugger = new GithubSlugger()
  const entries: TocEntry[] = []
  visit(tree, 'heading', (node: Heading) => {
    // rehype-slug slugs EVERY heading (h1-h6) to advance its counter, so we
    // must do the same here even for depths we don't include in the TOC —
    // otherwise our ids drift out of sync with the ids actually rendered on
    // the page and TOC links anchor to the wrong heading.
    const text = headingText(node)
    const id = slugger.slug(text)
    if (node.depth !== 2 && node.depth !== 3) return
    entries.push({ id, text, depth: node.depth })
  })
  return entries
}
