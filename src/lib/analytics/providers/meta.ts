declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
  }
}

let ready = false
let enabled = true

export function initMeta(): void {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  if (!pixelId) return
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return
  window.fbq('init', pixelId)
  ready = true
  enabled = true
}

export function trackMeta(eventName: string, properties: Record<string, unknown>): void {
  if (!ready || !enabled) return
  if (typeof window.fbq !== 'function') return
  window.fbq('track', eventName, properties)
}

export function trackMetaCustom(eventName: string, properties: Record<string, unknown>): void {
  if (!ready || !enabled) return
  if (typeof window.fbq !== 'function') return
  window.fbq('trackCustom', eventName, properties)
}

export function setMetaEnabled(value: boolean): void {
  enabled = value
}

export function isMetaReady(): boolean {
  return ready
}

export function getMetaPixelId(): string | null {
  return process.env.NEXT_PUBLIC_META_PIXEL_ID || null
}

/** @internal Test helper — resets module-level state for test isolation. */
export function resetMeta(): void {
  ready = false
  enabled = true
}
