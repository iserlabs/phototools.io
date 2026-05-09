import { trackPostHog } from './providers/posthog'
import { trackGA4 } from './providers/ga4'
import { trackMeta, trackMetaCustom, isMetaReady } from './providers/meta'
import { debugLog } from './debug'
import {
  META_EVENT_MAP,
  POSTHOG_ONLY_EVENTS,
  type GlobalProperties,
  type ToolInteractionEvent,
  type LearnPanelSectionViewEvent,
  type ChallengeStartEvent,
  type ChallengeCompleteEvent,
  type NavClickEvent,
  type ShareClickEvent,
  type LanguageSwitchEvent,
  type ThemeToggleEvent,
  type MobileMenuToggleEvent,
  type GlossarySearchEvent,
  type GlossaryEntryViewEvent,
  type FileUploadEvent,
  type AdSlotVisibleEvent,
  type MobileAdDismissEvent,
  type PageViewEvent,
  type AnalyticsEvent,
} from './types'

export type {
  ToolInteractionEvent,
  ChallengeCompleteEvent,
  GlobalProperties,
  AnalyticsEvent,
}

let globalProps: GlobalProperties = {
  locale: 'en',
  page_path: '/',
  viewport_type: 'desktop',
  tool_slug: null,
  tool_category: null,
}

export function setGlobalProperties(props: GlobalProperties): void {
  globalProps = props
}

export function dispatch(eventName: string, properties: Record<string, unknown>): void {
  const enriched = { ...globalProps, ...properties }
  const isPostHogOnly = POSTHOG_ONLY_EVENTS.has(eventName as AnalyticsEvent['name'])
  const metaMapping = META_EVENT_MAP[eventName as AnalyticsEvent['name']]

  trackPostHog(eventName, enriched)

  if (!isPostHogOnly) {
    trackGA4(eventName, enriched)
  }

  if (metaMapping && isMetaReady()) {
    const metaProps = { ...enriched }
    if (metaMapping.type === 'standard') {
      trackMeta(metaMapping.fbqName, metaProps)
    } else {
      trackMetaCustom(metaMapping.fbqName, metaProps)
    }
  }

  debugLog(eventName, enriched, {
    posthog: true,
    ga4: !isPostHogOnly,
    meta: Boolean(metaMapping && isMetaReady()),
  })
}

// --- Semantic tracking functions ---

export function trackToolInteraction(props: ToolInteractionEvent): void {
  dispatch('tool_interaction', props)
}

export function trackLearnPanelOpen(_props?: Record<string, never> | { tool_slug?: string }): void {
  dispatch('learn_panel_open', {})
}

export function trackLearnPanelSectionView(props: LearnPanelSectionViewEvent): void {
  dispatch('learn_panel_section_view', props)
}

export function trackChallengeStart(props: ChallengeStartEvent): void {
  dispatch('challenge_start', props)
}

export function trackChallengeComplete(props: ChallengeCompleteEvent | {
  tool_slug?: string; challenge_id: string; difficulty: string; correct: boolean
}): void {
  const normalized = {
    challenge_id: props.challenge_id,
    difficulty: props.difficulty,
    correct: props.correct,
    attempt_number: 'attempt_number' in props ? props.attempt_number : 1,
  }
  dispatch('challenge_complete', normalized)
}

export function trackNavClick(props: NavClickEvent): void {
  dispatch('nav_click', props)
}

export function trackShareClick(props: ShareClickEvent): void {
  dispatch('share_click', props)
}

export function trackLanguageSwitch(props: LanguageSwitchEvent): void {
  dispatch('language_switch', props)
}

export function trackThemeToggle(props: ThemeToggleEvent): void {
  dispatch('theme_toggle', props)
}

export function trackMobileMenuToggle(props: MobileMenuToggleEvent): void {
  dispatch('mobile_menu_toggle', props)
}

export function trackGlossarySearch(props: GlossarySearchEvent): void {
  dispatch('glossary_search', props)
}

export function trackGlossaryEntryView(props: GlossaryEntryViewEvent): void {
  dispatch('glossary_entry_view', props)
}

export function trackContactFormSubmit(): void {
  dispatch('contact_form_submit', {})
}

export function trackFileUpload(props: FileUploadEvent): void {
  dispatch('file_upload', props)
}

export function trackAdSlotVisible(props: AdSlotVisibleEvent): void {
  dispatch('ad_slot_visible', props)
}

export function trackMobileAdDismiss(props: MobileAdDismissEvent): void {
  dispatch('mobile_ad_dismiss', props)
}

export function trackPageView(props: PageViewEvent): void {
  dispatch('page_view', props)
}
