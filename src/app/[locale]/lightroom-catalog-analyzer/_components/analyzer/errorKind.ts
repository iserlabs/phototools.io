/**
 * Maps a thrown error from the analyzer worker (or hook) to one of the
 * `toolUI.lightroom-catalog-analyzer.errors.*` i18n key suffixes (M-5).
 *
 * The worker raises `UnsupportedCatalogError` with a `kind` discriminator, but
 * Comlink serializes errors to plain `{ name, message }` — the custom `kind`
 * property does not survive the structured-clone boundary. We therefore also
 * parse the `kind` token out of the message string (`"Unsupported catalog: X"`).
 */

export type ErrorKey =
  | 'parseFailed'
  | 'workerFailed'
  | 'schemaTooNew'
  | 'schemaTooOld'
  | 'tooLarge'
  | 'corrupt'
  | 'notLightroom'
  | 'unknown'

const CATALOG_KIND_TO_KEY: Record<string, ErrorKey> = {
  'not-sqlite': 'notLightroom',
  'not-lrc-classic': 'notLightroom',
  'schema-too-old': 'schemaTooOld',
  'schema-too-new': 'schemaTooNew',
  'too-large': 'tooLarge',
  corrupt: 'corrupt',
}

function rawKindFrom(e: unknown): string | undefined {
  if (!e || typeof e !== 'object') return undefined
  const withKind = e as { kind?: unknown; message?: unknown; name?: unknown }
  if (typeof withKind.kind === 'string') return withKind.kind
  // Fallback: parse "Unsupported catalog: <kind>" out of the message.
  if (typeof withKind.message === 'string') {
    const m = withKind.message.match(/Unsupported catalog:\s*([a-z-]+)/i)
    if (m) return m[1]
  }
  return undefined
}

export function errorKindFor(e: unknown): ErrorKey {
  const kind = rawKindFrom(e)
  if (kind && CATALOG_KIND_TO_KEY[kind]) return CATALOG_KIND_TO_KEY[kind]

  if (e && typeof e === 'object') {
    const msg = String((e as { message?: unknown }).message ?? '')
    if (/quota|too large|maximum|allocation|out of memory|RangeError/i.test(msg)) return 'tooLarge'
    if (/worker|module|failed to start|importScripts/i.test(msg)) return 'workerFailed'
    if (/failed to open catalog/i.test(msg)) return 'parseFailed'
  }
  return 'unknown'
}
