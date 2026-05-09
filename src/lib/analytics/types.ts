export type InputType = 'slider' | 'select' | 'toggle' | 'button' | 'scene-picker' | 'text-input'
export type ConsentCategory = 'analytics' | 'marketing'
export type ViewportType = 'mobile' | 'desktop'

export type GlobalProperties = {
  locale: string
  page_path: string
  viewport_type: ViewportType
  tool_slug: string | null
  tool_category: string | null
}

export type ToolInteractionEvent = {
  param_name: string
  param_value: string
  input_type: InputType
}

export type ToolEngagedEvent = {
  tool_slug: string
  duration_seconds: number
}

export type ToolSessionSummaryEvent = {
  tool_slug: string
  duration_seconds: number
  interaction_count: number
  final_params?: Record<string, string>
  param_count?: number
  primary_param?: string
}

export type ScrollDepthEvent = {
  depth_percent: 25 | 50 | 75 | 100
  viewport_type?: ViewportType
}

export type LearnPanelOpenEvent = Record<string, never>

export type LearnPanelSectionViewEvent = {
  section: 'beginner' | 'deeper' | 'factors' | 'tips'
}

export type ChallengeStartEvent = {
  challenge_id: string
  difficulty: string
}

export type ChallengeCompleteEvent = {
  challenge_id: string
  difficulty: string
  correct: boolean
  attempt_number: number
}

export type NavClickEvent = {
  target: string
  source: 'mega-menu' | 'footer' | 'homepage-card'
}

export type ShareClickEvent = {
  method: 'copy-link' | 'embed' | 'markdown' | 'bbcode'
}

export type LanguageSwitchEvent = {
  from_locale: string
  to_locale: string
}

export type ThemeToggleEvent = {
  new_theme: 'light' | 'dark'
}

export type OutboundClickEvent = {
  url: string
  link_text: string
  source: 'learn-panel' | 'footer' | 'nav'
}

export type MobileMenuToggleEvent = {
  action: 'open' | 'close'
}

export type MobileControlsToggleEvent = {
  action: 'open' | 'close'
}

export type GlossarySearchEvent = {
  search_term: string
  results_count: number
}

export type GlossaryEntryViewEvent = {
  term_id: string
}

export type ContactFormSubmitEvent = Record<string, never>

export type FileUploadEvent = {
  file_type: string
  file_size_kb: number
}

export type FileUploadErrorEvent = {
  error_type: string
  file_type: string
}

export type JsErrorEvent = {
  message: string
  source?: string
  line?: number
  column?: number
}

export type WebGLErrorEvent = {
  error_type: string
}

export type CapabilityCheckEvent = {
  feature: 'webgl2' | 'canvas'
  supported: boolean
}

export type AdSlotVisibleEvent = {
  slot_id: string
  format: string
  viewport_type: ViewportType
}

export type MobileAdDismissEvent = {
  time_before_dismiss_seconds: number
}

export type PageViewEvent = {
  page_path: string
  page_title: string
}

export type AnalyticsEvent =
  | { name: 'tool_interaction'; properties: ToolInteractionEvent }
  | { name: 'tool_engaged'; properties: ToolEngagedEvent }
  | { name: 'tool_session_summary'; properties: ToolSessionSummaryEvent }
  | { name: 'page_scroll_depth'; properties: ScrollDepthEvent }
  | { name: 'learn_panel_scroll_depth'; properties: ScrollDepthEvent }
  | { name: 'learn_panel_open'; properties: LearnPanelOpenEvent }
  | { name: 'learn_panel_section_view'; properties: LearnPanelSectionViewEvent }
  | { name: 'challenge_start'; properties: ChallengeStartEvent }
  | { name: 'challenge_complete'; properties: ChallengeCompleteEvent }
  | { name: 'nav_click'; properties: NavClickEvent }
  | { name: 'share_click'; properties: ShareClickEvent }
  | { name: 'language_switch'; properties: LanguageSwitchEvent }
  | { name: 'theme_toggle'; properties: ThemeToggleEvent }
  | { name: 'outbound_click'; properties: OutboundClickEvent }
  | { name: 'mobile_menu_toggle'; properties: MobileMenuToggleEvent }
  | { name: 'mobile_controls_toggle'; properties: MobileControlsToggleEvent }
  | { name: 'glossary_search'; properties: GlossarySearchEvent }
  | { name: 'glossary_entry_view'; properties: GlossaryEntryViewEvent }
  | { name: 'contact_form_submit'; properties: ContactFormSubmitEvent }
  | { name: 'file_upload'; properties: FileUploadEvent }
  | { name: 'file_upload_error'; properties: FileUploadErrorEvent }
  | { name: 'js_error'; properties: JsErrorEvent }
  | { name: 'webgl_error'; properties: WebGLErrorEvent }
  | { name: 'capability_check'; properties: CapabilityCheckEvent }
  | { name: 'ad_slot_visible'; properties: AdSlotVisibleEvent }
  | { name: 'mobile_ad_dismiss'; properties: MobileAdDismissEvent }
  | { name: 'page_view'; properties: PageViewEvent }

export const META_EVENT_MAP: Partial<Record<AnalyticsEvent['name'], { type: 'standard' | 'custom'; fbqName: string }>> = {
  page_view: { type: 'standard', fbqName: 'PageView' },
  share_click: { type: 'custom', fbqName: 'ShareClick' },
  glossary_search: { type: 'standard', fbqName: 'Search' },
  tool_engaged: { type: 'custom', fbqName: 'ToolEngaged' },
  challenge_complete: { type: 'custom', fbqName: 'ChallengeCompleted' },
}

export const POSTHOG_ONLY_EVENTS: Set<AnalyticsEvent['name']> = new Set([
  'theme_toggle',
  'mobile_menu_toggle',
  'mobile_controls_toggle',
])
