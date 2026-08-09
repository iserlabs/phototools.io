import { describe, it, expect, afterEach, vi } from 'vitest'
import { numParam, intParam, strParam, sensorParam, parseQueryState, stateToQuery, idSetParam, distanceOrInfParam } from './querySync'

describe('numParam', () => {
  const param = numParam(50, 10, 200)

  it('returns default value of 50', () => {
    expect(param.default).toBe(50)
  })

  it('parses a valid number within range', () => {
    expect(param.parse('100')).toBe(100)
  })

  it('parses a float within range', () => {
    expect(param.parse('55.5')).toBe(55.5)
  })

  it('parses the minimum boundary value', () => {
    expect(param.parse('10')).toBe(10)
  })

  it('parses the maximum boundary value', () => {
    expect(param.parse('200')).toBe(200)
  })

  it('rejects a value below the minimum', () => {
    expect(param.parse('9')).toBeUndefined()
  })

  it('rejects a value above the maximum', () => {
    expect(param.parse('201')).toBeUndefined()
  })

  it('rejects NaN input', () => {
    expect(param.parse('NaN')).toBeUndefined()
  })

  it('rejects non-numeric strings', () => {
    expect(param.parse('abc')).toBeUndefined()
  })

  it('rejects an empty string', () => {
    expect(param.parse('')).toBeUndefined()
  })

  it('serializes a number to a string', () => {
    expect(param.serialize(75)).toBe('75')
  })
})

describe('intParam', () => {
  const param = intParam(100, 0, 500)

  it('returns default value of 100', () => {
    expect(param.default).toBe(100)
  })

  it('parses a valid integer within range', () => {
    expect(param.parse('250')).toBe(250)
  })

  it('rounds a float down to the nearest integer', () => {
    expect(param.parse('99.4')).toBe(99)
  })

  it('rounds a float up to the nearest integer', () => {
    expect(param.parse('99.6')).toBe(100)
  })

  it('rounds 0.5 up per Math.round behavior', () => {
    expect(param.parse('99.5')).toBe(100)
  })

  it('parses the minimum boundary value', () => {
    expect(param.parse('0')).toBe(0)
  })

  it('parses the maximum boundary value', () => {
    expect(param.parse('500')).toBe(500)
  })

  it('rejects a value below the minimum after rounding', () => {
    expect(param.parse('-1')).toBeUndefined()
  })

  it('rejects a value above the maximum after rounding', () => {
    expect(param.parse('501')).toBeUndefined()
  })

  it('rejects NaN input', () => {
    expect(param.parse('hello')).toBeUndefined()
  })

  it('parses an empty string as 0 (Number("") === 0)', () => {
    // Number('') is 0, which rounds to 0 and falls within [0, 500]
    expect(param.parse('')).toBe(0)
  })

  it('rejects an empty string when 0 is out of range', () => {
    const strictParam = intParam(100, 1, 500)
    expect(strictParam.parse('')).toBeUndefined()
  })

  it('accepts a float that rounds into valid range', () => {
    // 0.4 rounds to 0, which is within [0, 500]
    expect(param.parse('0.4')).toBe(0)
  })

  it('serializes an integer to a string', () => {
    expect(param.serialize(300)).toBe('300')
  })
})

describe('strParam', () => {
  const param = strParam('red', ['red', 'green', 'blue'] as const)

  it('returns default value of red', () => {
    expect(param.default).toBe('red')
  })

  it('parses a valid allowed string', () => {
    expect(param.parse('green')).toBe('green')
  })

  it('parses another valid allowed string', () => {
    expect(param.parse('blue')).toBe('blue')
  })

  it('rejects an invalid string not in the allowed list', () => {
    expect(param.parse('yellow')).toBeUndefined()
  })

  it('rejects an empty string when not in the allowed list', () => {
    expect(param.parse('')).toBeUndefined()
  })

  it('is case-sensitive', () => {
    expect(param.parse('Red')).toBeUndefined()
  })

  it('serializes the value as-is', () => {
    expect(param.serialize('blue')).toBe('blue')
  })
})

describe('sensorParam', () => {
  it('uses ff as the default value', () => {
    const param = sensorParam()
    expect(param.default).toBe('ff')
  })

  it('accepts a custom default value', () => {
    const param = sensorParam('apsc')
    expect(param.default).toBe('apsc')
  })

  it('parses a non-empty string', () => {
    const param = sensorParam()
    expect(param.parse('apsc')).toBe('apsc')
  })

  it('rejects an empty string', () => {
    const param = sensorParam()
    expect(param.parse('')).toBeUndefined()
  })

  it('serializes the value as-is', () => {
    const param = sensorParam()
    expect(param.serialize('mft')).toBe('mft')
  })
})

describe('parseQueryState', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const schema = {
    focal: numParam(50, 10, 600),
    iso: intParam(100, 100, 12800),
    mode: strParam('auto', ['auto', 'manual'] as const),
    sensor: sensorParam('ff'),
  }

  it('parses all valid params from the URL', () => {
    vi.stubGlobal('location', { search: '?focal=85&iso=400&mode=manual&sensor=apsc' })
    const result = parseQueryState(schema)
    expect(result).toEqual({ focal: 85, iso: 400, mode: 'manual', sensor: 'apsc' })
  })

  it('returns empty object when no params are present', () => {
    vi.stubGlobal('location', { search: '' })
    const result = parseQueryState(schema)
    expect(result).toEqual({})
  })

  it('ignores params not in the schema', () => {
    vi.stubGlobal('location', { search: '?focal=85&unknown=999' })
    const result = parseQueryState(schema)
    expect(result).toEqual({ focal: 85 })
    expect(result).not.toHaveProperty('unknown')
  })

  it('skips invalid param values while keeping valid ones', () => {
    vi.stubGlobal('location', { search: '?focal=abc&iso=800&mode=invalid&sensor=mft' })
    const result = parseQueryState(schema)
    expect(result).toEqual({ iso: 800, sensor: 'mft' })
  })

  it('skips out-of-range numeric params', () => {
    vi.stubGlobal('location', { search: '?focal=9999&iso=50' })
    const result = parseQueryState(schema)
    expect(result).toEqual({})
  })

  it('returns empty object when window is undefined (SSR)', () => {
    const originalWindow = globalThis.window
    // @ts-expect-error -- simulate SSR environment
    delete globalThis.window
    const result = parseQueryState(schema)
    expect(result).toEqual({})
    globalThis.window = originalWindow
  })
})

describe('stateToQuery', () => {
  const schema = {
    focal: numParam(50, 10, 600),
    iso: intParam(100, 100, 12800),
    mode: strParam('auto', ['auto', 'manual'] as const),
    sensor: sensorParam('ff'),
  }

  it('omits params that match their defaults', () => {
    const state = { focal: 50, iso: 100, mode: 'auto' as const, sensor: 'ff' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qs = stateToQuery(state, schema as any)
    expect(qs).toBe('')
  })

  it('includes only params that differ from defaults', () => {
    const state = { focal: 85, iso: 100, mode: 'auto' as const, sensor: 'ff' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qs = stateToQuery(state, schema as any)
    expect(qs).toBe('focal=85')
  })

  it('includes multiple non-default params joined by ampersand', () => {
    const state = { focal: 85, iso: 400, mode: 'manual' as const, sensor: 'ff' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qs = stateToQuery(state, schema as any)
    expect(qs).toBe('focal=85&iso=400&mode=manual')
  })

  it('encodes special characters in keys and values', () => {
    const specialSchema = {
      'my key': strParam('a', ['a', 'b&c'] as const),
    }
    const state = { 'my key': 'b&c' as const }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qs = stateToQuery(state, specialSchema as any)
    expect(qs).toBe('my%20key=b%26c')
  })

  it('preserves plus signs instead of encoding them as %2B', () => {
    const plusSchema = {
      ev: strParam('0', ['0', '+1', '+2'] as const),
    }
    const state = { ev: '+1' as const }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qs = stateToQuery(state, plusSchema as any)
    expect(qs).toContain('+1')
    expect(qs).not.toContain('%2B')
  })

  it('includes all params when none match defaults', () => {
    const state = { focal: 200, iso: 800, mode: 'manual' as const, sensor: 'apsc' }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qs = stateToQuery(state, schema as any)
    expect(qs).toBe('focal=200&iso=800&mode=manual&sensor=apsc')
  })
})

describe('idSetParam', () => {
  const schema = { visible: idSetParam(['a', 'b']) }

  it('parses "a+c" into Set(a, c)', () => {
    vi.stubGlobal('window', { location: { search: '?visible=a+c' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = parseQueryState<{ visible: Set<string> }>(schema as any)
    expect(s.visible).toEqual(new Set(['a', 'c']))
    vi.unstubAllGlobals()
  })

  it('omits from query when Set contents equal default', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qs = stateToQuery({ visible: new Set(['b', 'a']) }, schema as any)
    expect(qs).toBe('')
  })

  it('serializes Set(a, c) alphabetically when different from default', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qs = stateToQuery({ visible: new Set(['c', 'a']) }, schema as any)
    expect(qs).toBe('visible=a+c')
  })
})

describe('ParamDef.equals', () => {
  it('is honored by stateToQuery for custom equality', () => {
    const schema = {
      s: {
        default: new Set(['a']),
        parse: (raw: string) => new Set(raw.split('+')),
        serialize: (v: Set<string>) => Array.from(v).join('+'),
        equals: (a: Set<string>, b: Set<string>) =>
          a.size === b.size && [...a].every(x => b.has(x)),
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const qs = stateToQuery({ s: new Set(['a']) }, schema as any)
    expect(qs).toBe('')
  })
})

describe('distanceOrInfParam', () => {
  const p = distanceOrInfParam(5, 0.1, 100)
  it('parses "inf" as Infinity', () => { expect(p.parse('inf')).toBe(Infinity) })
  it('serializes Infinity as "inf"', () => { expect(p.serialize(Infinity)).toBe('inf') })
  it('parses finite in-range values', () => { expect(p.parse('12.5')).toBe(12.5) })
  it('rejects out-of-range finite values', () => { expect(p.parse('500')).toBeUndefined() })
  it('rejects garbage', () => { expect(p.parse('banana')).toBeUndefined() })
  it('round-trips a finite value', () => { expect(p.parse(p.serialize(42))).toBe(42) })
})
