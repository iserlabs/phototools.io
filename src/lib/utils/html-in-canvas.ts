let cached: boolean | null = null

export function supportsHtmlInCanvas(): boolean {
  if (cached !== null) return cached
  if (typeof HTMLCanvasElement === 'undefined') {
    cached = false
    return false
  }
  cached = 'layoutSubtree' in HTMLCanvasElement.prototype
  return cached
}

supportsHtmlInCanvas.reset = () => { cached = null }
