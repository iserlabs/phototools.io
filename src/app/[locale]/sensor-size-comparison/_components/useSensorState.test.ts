import { describe, it, expect } from 'vitest'
import { parseVsParam } from './useSensorState'

const known = (id: string) => ['ff', 'apsc_n', 'film_6x7', 'custom_url_0'].includes(id)

describe('parseVsParam', () => {
  it('parses two known ids preserving order', () => {
    expect(parseVsParam('ff,apsc_n', known)).toEqual(['ff', 'apsc_n'])
    expect(parseVsParam('apsc_n,ff', known)).toEqual(['apsc_n', 'ff'])
  })
  it('accepts a custom id when it is known', () => {
    expect(parseVsParam('custom_url_0,ff', known)).toEqual(['custom_url_0', 'ff'])
  })
  it('rejects unknown ids, wrong arity, self-comparison, and junk', () => {
    expect(parseVsParam('ff,nope', known)).toBeNull()
    expect(parseVsParam('ff', known)).toBeNull()
    expect(parseVsParam('ff,apsc_n,m43', known)).toBeNull()
    expect(parseVsParam('ff,ff', known)).toBeNull()
    expect(parseVsParam('', known)).toBeNull()
    expect(parseVsParam(null, known)).toBeNull()
  })
  it('tolerates surrounding whitespace', () => {
    expect(parseVsParam(' ff , apsc_n ', known)).toEqual(['ff', 'apsc_n'])
  })
})
