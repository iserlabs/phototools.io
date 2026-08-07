import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./providers/posthog', () => ({
  initPostHog: vi.fn(),
  trackPostHog: vi.fn(),
  upgradePostHog: vi.fn(),
  downgradePostHog: vi.fn(),
}))
vi.mock('./providers/ga4', () => ({
  trackGA4: vi.fn(),
  updateGA4Consent: vi.fn(),
  trackGA4PageView: vi.fn(),
}))
vi.mock('./providers/meta', () => ({
  initMeta: vi.fn(),
  trackMeta: vi.fn(),
  trackMetaCustom: vi.fn(),
  setMetaEnabled: vi.fn(),
  isMetaReady: vi.fn(() => false),
  getMetaPixelId: vi.fn(() => null),
}))

import { trackPostHog } from './providers/posthog'
import { trackGA4 } from './providers/ga4'
import {
  dispatch,
  setGlobalProperties,
  trackToolInteraction,
  trackLearnPanelOpen,
  trackChallengeComplete,
  trackGuideToolClick,
  trackToolGuideClick,
} from './index'

describe('analytics dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setGlobalProperties({
      locale: 'en',
      page_path: '/en/fov-simulator',
      viewport_type: 'desktop',
      tool_slug: 'fov-simulator',
      tool_category: 'visualizer',
    })
  })

  it('dispatch enriches events with global properties', () => {
    dispatch('tool_interaction', { param_name: 'aperture', param_value: 'f/2.8', input_type: 'select' })
    expect(trackPostHog).toHaveBeenCalledWith('tool_interaction', expect.objectContaining({
      param_name: 'aperture',
      locale: 'en',
      page_path: '/en/fov-simulator',
      tool_slug: 'fov-simulator',
    }))
  })

  it('dispatch sends to PostHog and GA4 by default', () => {
    dispatch('tool_interaction', { param_name: 'aperture', param_value: 'f/2.8', input_type: 'select' })
    expect(trackPostHog).toHaveBeenCalled()
    expect(trackGA4).toHaveBeenCalled()
  })

  it('POSTHOG_ONLY_EVENTS skip GA4', () => {
    dispatch('theme_toggle', { new_theme: 'dark' })
    expect(trackPostHog).toHaveBeenCalled()
    expect(trackGA4).not.toHaveBeenCalled()
  })

  it('trackToolInteraction calls dispatch with correct event', () => {
    trackToolInteraction({ param_name: 'aperture', param_value: 'f/2.8', input_type: 'select' })
    expect(trackPostHog).toHaveBeenCalledWith('tool_interaction', expect.objectContaining({
      param_name: 'aperture',
    }))
  })

  it('trackLearnPanelOpen accepts empty or old-style args', () => {
    trackLearnPanelOpen({})
    expect(trackPostHog).toHaveBeenCalledWith('learn_panel_open', expect.objectContaining({
      locale: 'en',
    }))
  })

  it('trackChallengeComplete handles old signature without attempt_number', () => {
    trackChallengeComplete({
      challenge_id: 'c1', difficulty: 'easy', correct: true,
    })
    expect(trackPostHog).toHaveBeenCalledWith('challenge_complete', expect.objectContaining({
      challenge_id: 'c1',
      attempt_number: 1,
    }))
  })

  it('trackChallengeComplete passes attempt_number when provided', () => {
    trackChallengeComplete({
      challenge_id: 'c1', difficulty: 'easy', correct: true, attempt_number: 3,
    })
    expect(trackPostHog).toHaveBeenCalledWith('challenge_complete', expect.objectContaining({
      attempt_number: 3,
    }))
  })

  it('trackGuideToolClick calls dispatch with correct event', () => {
    trackGuideToolClick({ guide_slug: 'astrophotography-basics', tool_slug: 'star-trail-calculator', source: 'tool-card' })
    expect(trackPostHog).toHaveBeenCalledWith('guide_tool_click', expect.objectContaining({
      guide_slug: 'astrophotography-basics',
      tool_slug: 'star-trail-calculator',
      source: 'tool-card',
    }))
  })

  it('trackGuideToolClick is PostHog-only and skips GA4', () => {
    trackGuideToolClick({ guide_slug: 'astrophotography-basics', tool_slug: 'star-trail-calculator', source: 'related-rail' })
    expect(trackPostHog).toHaveBeenCalled()
    expect(trackGA4).not.toHaveBeenCalled()
  })

  it('trackToolGuideClick calls dispatch with correct event', () => {
    trackToolGuideClick({ tool_slug: 'star-trail-calculator', guide_slug: 'astrophotography-basics' })
    expect(trackPostHog).toHaveBeenCalledWith('tool_guide_click', expect.objectContaining({
      tool_slug: 'star-trail-calculator',
      guide_slug: 'astrophotography-basics',
    }))
  })

  it('trackToolGuideClick is PostHog-only and skips GA4', () => {
    trackToolGuideClick({ tool_slug: 'star-trail-calculator', guide_slug: 'astrophotography-basics' })
    expect(trackPostHog).toHaveBeenCalled()
    expect(trackGA4).not.toHaveBeenCalled()
  })
})
