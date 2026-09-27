import { describe, it, expect } from 'vitest'
import { staticRedirects } from './redirects'

describe('staticRedirects', () => {
  it('permanently redirects the bare old color tool slug', () => {
    const r = staticRedirects.find((x) => x.source === '/color-scheme-generator')
    expect(r).toBeDefined()
    expect(r!.destination).toBe('/color-analyzer')
    expect(r!.permanent).toBe(true)
  })

  it('permanently redirects the locale-prefixed old color tool slug', () => {
    const r = staticRedirects.find((x) => x.source === '/:locale/color-scheme-generator')
    expect(r).toBeDefined()
    expect(r!.destination).toBe('/:locale/color-analyzer')
    expect(r!.permanent).toBe(true)
  })
})
