import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import nextPlugin from '@next/eslint-plugin-next'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['.next'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@next/next': nextPlugin,
      import: importPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@typescript-eslint/consistent-type-imports': ['warn', {
        prefer: 'type-imports',
        fixStyle: 'inline-type-imports',
      }],
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      // Guardrail against phantom imports: catch any `import from 'foo'` where
      // 'foo' is only a transitive dep. This exact failure (advanced-cropper
      // imported but only reachable via react-advanced-cropper) broke the
      // Vercel production build for ~14h because pnpm's strict isolated
      // layout doesn't expose transitive deps the way npm's flat hoisting
      // does. Test files, configs, and scripts are allowed to use
      // devDependencies.
      'import/no-extraneous-dependencies': ['error', {
        devDependencies: [
          '**/*.test.{ts,tsx}',
          '**/*.spec.{ts,tsx}',
          '**/__test-helpers__.{ts,tsx}',
          '**/test-fixtures/**',
          'src/e2e/**',
          'scripts/**',
          'test-setup*.ts',
          'vitest.config.ts',
          'playwright.config.ts',
          'eslint.config.js',
          'next.config.ts',
          'sentry.*.config.ts',
        ],
        optionalDependencies: false,
        peerDependencies: false,
      }],
    },
  },
)
