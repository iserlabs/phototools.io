'use client'

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { Nav } from './Nav'
import { Footer } from './Footer'
import { MobileAdBanner } from '@/components/shared/MobileAdBanner'
import { safeStorageGet, safeStorageSet } from '@/lib/utils/safe-storage'
import styles from './ThemeProvider.module.css'

interface ThemeContextValue {
  theme: 'dark' | 'light'
  setTheme: (t: 'dark' | 'light') => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'dark', setTheme: () => {} })
export function useTheme() { return useContext(ThemeContext) }

export function ThemeProvider({ children, hasGuides = false }: { children: ReactNode; hasGuides?: boolean }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  // Tracks whether we've read the persisted theme from localStorage yet.
  // Without this, the write effect fires on initial mount with the default
  // 'dark' state and overwrites the user's saved preference. This bug
  // surfaces on every locale switch because changing the [locale] segment
  // remounts the provider.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Guarded access: Safari with "Block All Cookies" throws a SecurityError
    // on any localStorage read (Sentry PHOTOTOOLS-R) — fall back to 'dark'.
    const saved = safeStorageGet('phototools-theme') as 'dark' | 'light' | null
    if (saved) setTheme(saved)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    document.documentElement.setAttribute('data-theme', theme)
    safeStorageSet('phototools-theme', theme)
  }, [theme, hydrated])

  return (
    <ThemeContext value={{ theme, setTheme }}>
      <Nav theme={theme} onThemeChange={setTheme} hasGuides={hasGuides} />
      <main className={styles.main}>{children}</main>
      <Footer hasGuides={hasGuides} />
      <MobileAdBanner />
      <Toaster theme={theme} position="bottom-center" />
    </ThemeContext>
  )
}
