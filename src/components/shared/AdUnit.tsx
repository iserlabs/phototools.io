'use client'

import { useEffect, useRef, useState } from 'react'
import { isAdsEnabled, AD_FORMATS, getAdsenseClient } from '@/lib/ads'
import type { AdFormat } from '@/lib/ads'
import { trackAdSlotVisible } from '@/lib/analytics'
import styles from './AdUnit.module.css'

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[]
  }
}

interface AdUnitProps {
  slot: string
  format: AdFormat
  className?: string
  channel?: string
  testId?: string
}

export function AdUnit({ slot, format, className, channel, testId }: AdUnitProps) {
  const insRef = useRef<HTMLModElement>(null)
  const pushedRef = useRef(false)
  const [loaded, setLoaded] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { width, height } = AD_FORMATS[format]

  useEffect(() => {
    // Skip when there's no configured slot — the component returns null
    // below and never renders an <ins>, so calling push({}) would target
    // some OTHER adsbygoogle element (e.g. one Auto Ads auto-injected) and
    // throw "All 'ins' elements already have ads in them" once those were
    // already filled. Return null early and let AdSense's auto-ads layer
    // manage the queue on its own.
    if (!isAdsEnabled() || !slot) return

    // Guard against AdSense's "All 'ins' elements already have ads in them"
    // TagError. The error gets logged asynchronously from AdSense's queue
    // processor (outside our try/catch) if the effect runs again for an
    // <ins> that's already filled — e.g. on App Router route transitions
    // where the component re-mounts but AdSense's DOM state was never
    // cleared.
    if (pushedRef.current) return
    pushedRef.current = true

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      // AdSense library not loaded yet (e.g. blocked by adblocker). Reset so
      // a future effect can retry.
      pushedRef.current = false
    }

    const ins = insRef.current
    if (!ins) return

    // Watch for AdSense injecting an iframe (= ad loaded successfully).
    // Swap skeleton placeholder for the real ad once detected.
    const observer = new MutationObserver(() => {
      if (ins.querySelector('iframe')) {
        setLoaded(true)
        observer.disconnect()
      }
    })
    observer.observe(ins, { childList: true, subtree: true })

    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          trackAdSlotVisible({
            slot_id: slot,
            format,
            viewport_type: window.innerWidth < 768 ? 'mobile' : 'desktop',
          })
          visibilityObserver.disconnect()
        }
      },
      { threshold: 0.5 },
    )
    visibilityObserver.observe(ins)

    // If no ad fills within 5s (adblocker, no inventory, consent denied),
    // collapse the container to avoid an empty gap in the layout.
    const timeout = setTimeout(() => {
      if (!ins.querySelector('iframe')) {
        setCollapsed(true)
      }
      observer.disconnect()
    }, 5000)

    return () => {
      observer.disconnect()
      visibilityObserver.disconnect()
      clearTimeout(timeout)
    }
  }, [slot, format])

  if (!isAdsEnabled() || !slot) return null

  const client = getAdsenseClient()

  return (
    <div
      className={`${styles.container} ${collapsed ? styles.collapsed : ''} ${className ?? ''}`}
      data-testid={testId}
    >
      <span className={styles.label}>Advertisement</span>
      <ins
        ref={insRef}
        className={`adsbygoogle ${loaded ? '' : styles.skeleton} ${styles.slot}`}
        style={{ display: 'inline-block', width, height }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        {...(channel ? { 'data-ad-channel': channel } : {})}
      />
    </div>
  )
}
