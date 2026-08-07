import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test-setup.ts'],
    // Overriding vitest's default excludes, so globs must cover nested
    // node_modules and .claude worktrees (their src/ would otherwise match).
    exclude: ['**/node_modules/**', 'src/e2e/**', '.claude/**'],
    clearMocks: true,
    restoreMocks: true,
    server: {
      deps: {
        // next-intl's client navigation (createNavigation -> next/navigation)
        // is externalized by default and resolved via strict Node ESM rules,
        // which fail because installed `next` ships no "exports" map for
        // subpaths like "next/navigation" (no extensionless fallback).
        // Inlining routes it through Vite's lenient resolver instead.
        inline: ['next-intl'],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/*.d.ts'],
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    alias: {
      '@': new URL('./src/', import.meta.url).pathname,
      'server-only': new URL('./test-setup-server-only.ts', import.meta.url).pathname,
    },
  },
})
