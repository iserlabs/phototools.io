export interface Tooltip {
  term: string
  definition: string
}

// ── Skeleton types for i18n ─────────────────────────────────────────
// Non-translatable challenge data kept in TS; translatable strings come from JSON

export interface ChallengeSkeleton {
  id: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  targetField: string
  acceptedValues?: string[]
  acceptedRange?: { min: number; max: number }
  /** Option values only — labels come from translation JSON */
  optionValues?: string[]
  correctOption?: string
}

export interface ToolEducationSkeleton {
  slug: string
  /** Whether deeper is a single string or an array of sections */
  deeperSections?: number
  /** Tooltip keys (code identifiers, not translatable) */
  tooltipKeys: string[]
  /** Number of key factors */
  keyFactorCount: number
  /** Number of pro tips */
  tipCount: number
  /** Challenge skeletons with non-translatable data */
  challenges: ChallengeSkeleton[]
}

export interface ChallengeProgress {
  [challengeId: string]: {
    completed: boolean
    completedAt: string
  }
}
