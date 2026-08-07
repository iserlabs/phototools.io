import type { MDXComponents } from 'mdx/types'

// Guide embeds are injected per-render via the `components` prop in the guide
// page (they need the guide slug bound). This global map stays minimal.
const components: MDXComponents = {}

export function useMDXComponents(): MDXComponents {
  return components
}
