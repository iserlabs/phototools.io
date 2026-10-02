import { describe, it, expect, vi, beforeEach } from 'vitest'
import type * as ToolsModule from '@/lib/data/tools'

const status = vi.hoisted(() => ({ value: 'draft' as 'live' | 'draft' }))

vi.mock('@/lib/data/tools', async (importOriginal) => ({
  ...(await importOriginal<typeof ToolsModule>()),
  getToolStatus: () => status.value,
}))
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: string) => key,
}))
vi.mock('./_components/DofSimulator', () => ({ DofSimulator: () => null }))
vi.mock('@/components/shared/UnderConstruction', () => ({ UnderConstruction: () => null }))

import DofSimulatorPage, { generateMetadata } from './page'
import { DofSimulator } from './_components/DofSimulator'
import { UnderConstruction } from '@/components/shared/UnderConstruction'

const params = Promise.resolve({ locale: 'en' })

describe('dof-simulator page gate', () => {
  beforeEach(() => {
    status.value = 'draft'
  })

  it('serves the noindexed placeholder while the tool is draft', async () => {
    expect(DofSimulatorPage().type).toBe(UnderConstruction)
    expect((await generateMetadata({ params })).robots).toEqual({ index: false, follow: true })
  })

  it('serves the real simulator, indexable, once live', async () => {
    status.value = 'live'
    expect(DofSimulatorPage().type).toBe(DofSimulator)
    expect((await generateMetadata({ params })).robots).toBeUndefined()
  })
})
