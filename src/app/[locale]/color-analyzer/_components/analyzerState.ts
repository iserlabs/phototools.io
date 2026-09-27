import { SAMPLE_CAP } from '@/lib/data/colorAnalyzer'
import type { SampledColor } from './useSampling'

export interface Sample extends SampledColor {
  id: string
  /** image-relative 0..1 */
  x: number
  y: number
  label: string
  locked: boolean
}

export interface SampleState {
  samples: Sample[]
  selectedId: string | null
  customTargets: Record<string, number>
}

export const EMPTY_STATE: SampleState = { samples: [], selectedId: null, customTargets: {} }

export type SampleAction =
  | { type: 'add'; id: string; x: number; y: number; color: SampledColor; label: string }
  | { type: 'replaceAll'; samples: Sample[] }
  | { type: 'move'; id: string; x: number; y: number; color: SampledColor }
  | { type: 'relabel'; id: string; label: string }
  | { type: 'select'; id: string | null }
  | { type: 'lock'; id: string; locked: boolean }
  | { type: 'remove'; id: string }
  | { type: 'setCustomTarget'; id: string; hue: number }
  | { type: 'resetCustomTargets' }
  | { type: 'clear' }

let counter = 0
export function newSampleId(): string {
  counter += 1
  return `s${Date.now().toString(36)}${counter}`
}

export function sampleReducer(state: SampleState, action: SampleAction): SampleState {
  switch (action.type) {
    case 'add': {
      if (state.samples.length >= SAMPLE_CAP) return state
      const sample: Sample = { id: action.id, x: action.x, y: action.y, ...action.color, label: action.label, locked: false }
      return { ...state, samples: [...state.samples, sample], selectedId: action.id }
    }
    case 'replaceAll':
      return { samples: action.samples.slice(0, SAMPLE_CAP).map((s) => ({ ...s, locked: false })), selectedId: null, customTargets: {} }
    case 'move':
      return { ...state, samples: state.samples.map((s) => s.id === action.id ? { ...s, x: action.x, y: action.y, ...action.color } : s) }
    case 'relabel':
      return { ...state, samples: state.samples.map((s) => s.id === action.id ? { ...s, label: action.label } : s) }
    case 'select':
      return { ...state, selectedId: action.id }
    case 'lock':
      return {
        ...state,
        samples: state.samples.map((s) =>
          s.id === action.id ? { ...s, locked: action.locked }
          : action.locked ? { ...s, locked: false } : s,
        ),
      }
    case 'remove': {
      const customTargets = { ...state.customTargets }
      delete customTargets[action.id]
      return {
        samples: state.samples.filter((s) => s.id !== action.id),
        selectedId: state.selectedId === action.id ? null : state.selectedId,
        customTargets,
      }
    }
    case 'setCustomTarget':
      return { ...state, customTargets: { ...state.customTargets, [action.id]: ((action.hue % 360) + 360) % 360 } }
    case 'resetCustomTargets':
      return { ...state, customTargets: Object.fromEntries(state.samples.filter((s) => !s.neutral).map((s) => [s.id, s.hsl.h])) }
    case 'clear':
      return EMPTY_STATE
  }
}
