import { describe, it, expect } from 'vitest'
import { TOOLS, getToolBySlug, getLiveTools, getVisibleTools, getAllTools, getToolStatus } from './tools'

describe('TOOLS registry', () => {
  it('contains at least one tool', () => {
    expect(TOOLS.length).toBeGreaterThan(0)
  })

  it('all tools have required fields', () => {
    for (const tool of TOOLS) {
      expect(tool.slug).toBeTruthy()
      expect(tool.name).toBeTruthy()
      expect(tool.description).toBeTruthy()
      expect(['live', 'draft', 'disabled']).toContain(tool.dev)
      expect(['live', 'draft', 'disabled']).toContain(tool.prod)
      expect(['calculator', 'visualizer', 'reference', 'file-tool']).toContain(tool.category)
    }
  })

  it('slugs are unique', () => {
    const slugs = TOOLS.map((t) => t.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('getToolBySlug returns correct tool', () => {
    const tool = getToolBySlug('fov-simulator')
    expect(tool?.name).toBe('Field-of-View Simulator')
  })

  it('getToolBySlug returns undefined for unknown slug', () => {
    expect(getToolBySlug('nonexistent')).toBeUndefined()
  })

  it('getLiveTools returns only tools with live status for current env', () => {
    const live = getLiveTools()
    for (const tool of live) {
      expect(getToolStatus(tool)).toBe('live')
    }
  })

  it('getAllTools returns every tool regardless of status', () => {
    const all = getAllTools()
    expect(all).toHaveLength(TOOLS.length)
    expect(all).toEqual(TOOLS)
  })

  it('getToolStatus returns live, draft, or disabled', () => {
    for (const tool of TOOLS) {
      expect(['live', 'draft', 'disabled']).toContain(getToolStatus(tool))
    }
  })

  it('getLiveTools is a subset of getVisibleTools', () => {
    const live = getLiveTools()
    const visible = getVisibleTools()
    for (const tool of live) {
      expect(visible).toContainEqual(tool)
    }
  })

  it('getVisibleTools excludes disabled tools', () => {
    const visible = getVisibleTools()
    for (const tool of visible) {
      expect(getToolStatus(tool)).not.toBe('disabled')
    }
  })

  it('getVisibleTools is a subset of getAllTools', () => {
    const visible = getVisibleTools()
    const all = getAllTools()
    for (const tool of visible) {
      expect(all).toContainEqual(tool)
    }
  })

  it('every tool slug is a valid URL path segment', () => {
    for (const tool of TOOLS) {
      expect(tool.slug).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('never uses the reserved "guides" slug (route segment for the Guides section)', () => {
    for (const tool of TOOLS) {
      expect(tool.slug).not.toBe('guides')
    }
  })
})
