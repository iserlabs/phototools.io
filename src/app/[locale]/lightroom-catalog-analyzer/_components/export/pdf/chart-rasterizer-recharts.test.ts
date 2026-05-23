import { describe, expect, it } from 'vitest'
import { rasterizeRechartsCharts } from './chart-rasterizer-recharts'

describe('rasterizeRechartsCharts', () => {
  it('runs getters strictly sequentially (never overlapping)', async () => {
    let active = 0
    let maxActive = 0
    const makeGetter = (val: string) => async () => {
      active++
      maxActive = Math.max(maxActive, active)
      await new Promise((r) => setTimeout(r, 5))
      active--
      return `data:image/png;base64,${val}`
    }
    const result = await rasterizeRechartsCharts({ gear: makeGetter('A'), ratings: makeGetter('B') })
    expect(maxActive).toBe(1) // never two html2canvas passes at once
    expect(result.gear).toBe('data:image/png;base64,A')
    expect(result.ratings).toBe('data:image/png;base64,B')
  })

  it('returns null for getters that resolve undefined', async () => {
    const result = await rasterizeRechartsCharts({
      gear: async () => undefined,
      ratings: async () => 'data:image/png;base64,B',
    })
    expect(result.gear).toBeNull()
    expect(result.ratings).toBe('data:image/png;base64,B')
  })

  it('preserves insertion order of keys', async () => {
    const order: string[] = []
    await rasterizeRechartsCharts({
      a: async () => { order.push('a'); return 'data:image/png;base64,a' },
      b: async () => { order.push('b'); return 'data:image/png;base64,b' },
      c: async () => { order.push('c'); return 'data:image/png;base64,c' },
    })
    expect(order).toEqual(['a', 'b', 'c'])
  })
})
