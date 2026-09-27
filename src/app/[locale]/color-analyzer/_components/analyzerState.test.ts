import { describe, it, expect } from 'vitest'
import { sampleReducer, EMPTY_STATE, type SampleState, type Sample } from './analyzerState'
import { SAMPLE_CAP } from '@/lib/data/colorAnalyzer'

const color = (h: number) => ({ rgb: { r: 10, g: 20, b: 30 }, hsl: { h, s: 50, l: 50 }, neutral: false })
const add = (state: SampleState, id: string, h = 200) =>
  sampleReducer(state, { type: 'add', id, x: 0.5, y: 0.5, color: color(h), label: 'blue' })

describe('sampleReducer', () => {
  it('adds a sample and selects it', () => {
    const s = add(EMPTY_STATE, 'a')
    expect(s.samples).toHaveLength(1)
    expect(s.samples[0]).toMatchObject({ id: 'a', x: 0.5, y: 0.5, label: 'blue', locked: false, neutral: false })
    expect(s.selectedId).toBe('a')
  })

  it('refuses to add beyond SAMPLE_CAP', () => {
    let s = EMPTY_STATE
    for (let i = 0; i < SAMPLE_CAP + 2; i++) s = add(s, `s${i}`)
    expect(s.samples).toHaveLength(SAMPLE_CAP)
  })

  it('move updates position and colour, keeps label and lock', () => {
    let s = add(EMPTY_STATE, 'a')
    s = sampleReducer(s, { type: 'lock', id: 'a', locked: true })
    s = sampleReducer(s, { type: 'move', id: 'a', x: 0.1, y: 0.2, color: color(30) })
    expect(s.samples[0]).toMatchObject({ x: 0.1, y: 0.2, locked: true, label: 'blue' })
    expect(s.samples[0].hsl.h).toBe(30)
  })

  it('lock is exclusive', () => {
    let s = add(add(EMPTY_STATE, 'a'), 'b')
    s = sampleReducer(s, { type: 'lock', id: 'a', locked: true })
    s = sampleReducer(s, { type: 'lock', id: 'b', locked: true })
    expect(s.samples.map((x) => x.locked)).toEqual([false, true])
  })

  it('remove clears selection, lock and custom target for that id', () => {
    let s = add(add(EMPTY_STATE, 'a'), 'b')
    s = sampleReducer(s, { type: 'lock', id: 'b', locked: true })
    s = sampleReducer(s, { type: 'setCustomTarget', id: 'b', hue: 90 })
    s = sampleReducer(s, { type: 'select', id: 'b' })
    s = sampleReducer(s, { type: 'remove', id: 'b' })
    expect(s.samples.map((x) => x.id)).toEqual(['a'])
    expect(s.selectedId).toBeNull()
    expect(s.customTargets).toEqual({})
  })

  it('resetCustomTargets sets every scorable sample target to its own hue', () => {
    let s = add(add(EMPTY_STATE, 'a', 100), 'b', 250)
    s = sampleReducer(s, { type: 'resetCustomTargets' })
    expect(s.customTargets).toEqual({ a: 100, b: 250 })
  })

  it('replaceAll swaps the set, clears selection/lock/custom targets', () => {
    let s = add(EMPTY_STATE, 'a')
    s = sampleReducer(s, { type: 'setCustomTarget', id: 'a', hue: 5 })
    const next: Sample[] = [{ id: 'z', x: 0.2, y: 0.2, ...color(10), label: 'red', locked: true }]
    s = sampleReducer(s, { type: 'replaceAll', samples: next })
    expect(s.samples.map((x) => x.id)).toEqual(['z'])
    expect(s.samples[0].locked).toBe(false)
    expect(s.selectedId).toBeNull()
    expect(s.customTargets).toEqual({})
  })

  it('clear returns EMPTY_STATE', () => {
    expect(sampleReducer(add(EMPTY_STATE, 'a'), { type: 'clear' })).toEqual(EMPTY_STATE)
  })
})
