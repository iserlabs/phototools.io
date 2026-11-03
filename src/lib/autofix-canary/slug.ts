// TEMPORARY — sandbox-hardening canary for the hub's Sentry auto-fix (2026-11-03).
// Unit-reproducible on purpose. Remove after the proof.
export function slug(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, '-')
}
