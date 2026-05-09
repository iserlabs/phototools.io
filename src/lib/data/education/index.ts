import { TOOL_EDUCATION_SKELETONS } from './content'
import { TOOL_EDUCATION_SKELETONS_2 } from './content2'
import type { ToolEducationSkeleton, ChallengeProgress } from './types'

const ALL_SKELETONS: ToolEducationSkeleton[] = [...TOOL_EDUCATION_SKELETONS, ...TOOL_EDUCATION_SKELETONS_2]

export function getSkeletonBySlug(slug: string): ToolEducationSkeleton | undefined {
  return ALL_SKELETONS.find((s) => s.slug === slug)
}

export function getAllSkeletons(): ToolEducationSkeleton[] {
  return ALL_SKELETONS
}

const PROGRESS_KEY = 'phototools-challenge-progress'

function getChallengeProgress(): ChallengeProgress {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function markChallengeComplete(challengeId: string): void {
  const progress = getChallengeProgress()
  progress[challengeId] = { completed: true, completedAt: new Date().toISOString() }
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export function isChallengeComplete(challengeId: string): boolean {
  return getChallengeProgress()[challengeId]?.completed === true
}

export function clearChallengeProgressForTool(challengeIds: string[]): void {
  const progress = getChallengeProgress()
  for (const id of challengeIds) delete progress[id]
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
}

export type { ToolEducationSkeleton, ChallengeProgress, ChallengeSkeleton } from './types'
