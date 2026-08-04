import { describe, it, expect } from 'vitest'
import { getSkeletonBySlug } from './index'
import { TOOL_EDUCATION_SKELETONS } from './content'
import { TOOL_EDUCATION_SKELETONS_2 } from './content2'
import { TOOL_EDUCATION_SKELETONS_3 } from './content3'
import { TOOLS } from '../tools'

const ALL_SKELETONS = [...TOOL_EDUCATION_SKELETONS, ...TOOL_EDUCATION_SKELETONS_2, ...TOOL_EDUCATION_SKELETONS_3]

describe('Education skeletons', () => {
  it('every skeleton has a valid structure', () => {
    for (const skel of ALL_SKELETONS) {
      expect(skel.slug).toBeTruthy()
      expect(skel.keyFactorCount).toBeGreaterThan(0)
      expect(skel.tipCount).toBeGreaterThan(0)
      expect(Array.isArray(skel.tooltipKeys)).toBe(true)
      expect(skel.tooltipKeys.length).toBeGreaterThan(0)
    }
  })

  it('challenges have required skeleton fields', () => {
    for (const skel of ALL_SKELETONS) {
      for (const c of skel.challenges) {
        expect(c.id).toBeTruthy()
        expect(['beginner', 'intermediate', 'advanced']).toContain(c.difficulty)
        expect(c.targetField).toBeTruthy()
      }
    }
  })

  it('challenges with optionValues have a correctOption that matches one of the values', () => {
    for (const skel of ALL_SKELETONS) {
      for (const c of skel.challenges) {
        if (c.optionValues && c.correctOption) {
          expect(c.optionValues).toContain(c.correctOption)
        }
      }
    }
  })

  it('returns undefined for unknown slug', () => {
    expect(getSkeletonBySlug('nonexistent-tool')).toBeUndefined()
  })

  it('skeleton slugs are unique', () => {
    const slugs = ALL_SKELETONS.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('every skeleton slug matches a tool slug or known sub-feature', () => {
    const toolSlugs = new Set(TOOLS.map((t) => t.slug))
    const knownSubFeatures = new Set(['histogram']) // histogram is part of exif-viewer
    for (const skel of ALL_SKELETONS) {
      expect(toolSlugs.has(skel.slug) || knownSubFeatures.has(skel.slug)).toBe(true)
    }
  })

  it('challenge IDs are globally unique', () => {
    const ids: string[] = []
    for (const skel of ALL_SKELETONS) {
      for (const c of skel.challenges) {
        ids.push(c.id)
      }
    }
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('deeperSections is defined only for tools with array-based deeper content', () => {
    for (const skel of ALL_SKELETONS) {
      if (skel.deeperSections !== undefined) {
        expect(skel.deeperSections).toBeGreaterThan(0)
      }
    }
  })

  it('getSkeletonBySlug returns correct skeleton', () => {
    for (const skel of ALL_SKELETONS) {
      const found = getSkeletonBySlug(skel.slug)
      expect(found).toBeDefined()
      expect(found!.slug).toBe(skel.slug)
    }
  })
})
