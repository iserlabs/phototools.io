/**
 * Build a stable export filename: phototools-{first 8 chars of hash}-{ISO date}.{ext}
 * Shared by the Markdown and PDF exporters so the two outputs sort together.
 */
export function exportFilename(catalogHash: string, date: Date, ext: 'md' | 'pdf'): string {
  const hash8 = catalogHash.slice(0, 8)
  const iso = date.toISOString().slice(0, 10)
  return `phototools-${hash8}-${iso}.${ext}`
}

/** Trigger a browser download via an ephemeral anchor element. */
function downloadUrl(url: string, filename: string): void {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Trigger a browser download of `text` as a `.md` file. Browser-only. */
export function downloadMarkdown(text: string, filename: string): void {
  downloadUrl(URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' })), filename)
}

/** Trigger a browser download of a pre-built Blob (used by the PDF exporter). */
export function downloadBlob(blob: Blob, filename: string): void {
  downloadUrl(URL.createObjectURL(blob), filename)
}
