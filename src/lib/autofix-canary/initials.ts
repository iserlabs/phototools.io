// TEMPORARY — proof-loop canary A for the hub's Sentry auto-fix (unit-reproducible). Remove after the proof.
// `fullName` is null when the query parameter is absent, so a missing/blank name yields no initials.
export function initials(fullName: string | null): string {
  if (!fullName) return ''
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join('')
}
