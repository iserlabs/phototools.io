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
    if (node.depth !== 2 && node.depth !== 3) return
    const text = headingText(node)
    entries.push({ id: slugger.slug(text), text, depth: node.depth })
  })
  return entries
}
