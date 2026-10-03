// TEMPORARY — proof-loop canary A for the hub's Sentry auto-fix (unit-reproducible). Remove after the proof.
// Deliberate bug: `fullName` is null when the query parameter is absent; the cast hides it from tsc.
export function initials(fullName: string | null): string {
  return (fullName as string)
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .join('')
}
