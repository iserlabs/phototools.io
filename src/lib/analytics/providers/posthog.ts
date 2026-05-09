import posthog from 'posthog-js'

let initialized = false

export function initPostHog(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
  if (!key || !host) return

  posthog.init(key, {
    api_host: host,
    ui_host: 'https://us.posthog.com',
    persistence: 'memory',
    autocapture: true,
    capture_pageview: false,
    capture_pageleave: true,
    disable_session_recording: true,
    mask_all_element_attributes: false,
    session_recording: {
      maskAllInputs: false,
    },
  })
  initialized = true
}

export function trackPostHog(eventName: string, properties: Record<string, unknown>): void {
  if (!initialized) return
  // PostHog's built-in dashboards (DAU/WAU, retention, web analytics) key off
  // the special `$pageview` event. Translate our generic `page_view` event name
  // when forwarding to PostHog so those dashboards populate.
  const phEventName = eventName === 'page_view' ? '$pageview' : eventName
  posthog.capture(phEventName, properties)
}

export function upgradePostHog(): void {
  if (!initialized) return
  posthog.opt_in_capturing()
  posthog.set_config({ persistence: 'localStorage+cookie' })
  posthog.startSessionRecording()
}

export function downgradePostHog(): void {
  if (!initialized) return
  posthog.opt_out_capturing()
  posthog.stopSessionRecording()
}

/** @internal Test helper — resets the module-level `initialized` flag. */
export function resetPostHog(): void {
  initialized = false
}
