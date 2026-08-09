export async function copyCanvasToClipboard(canvas: HTMLCanvasElement, filename = 'image.png'): Promise<boolean> {
  try {
    // Create an offscreen canvas to apply the watermark without affecting the original
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = canvas.width
    tempCanvas.height = canvas.height
    const ctx = tempCanvas.getContext('2d')
    if (!ctx) return false

    // Fill background based on current theme (prevents transparent exports)
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light'
    ctx.fillStyle = isDark ? '#0d0d0d' : '#fafafa'
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

    // Draw the original image
    ctx.drawImage(canvas, 0, 0)

    // Add professional watermark
    ctx.save()
    const paddingX = Math.max(12, Math.floor(canvas.width * 0.015))
    const paddingY = Math.max(12, Math.floor(canvas.height * 0.015))
    const fontSize = Math.max(14, Math.floor(canvas.width * 0.015)) // Responsive font size
    ctx.font = `600 ${fontSize}px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`
    const text = 'phototools.io'
    const textMetrics = ctx.measureText(text)
    const textWidth = textMetrics.width
    
    // Background pill dimensions
    const bgPaddingX = fontSize * 0.6
    const bgPaddingY = fontSize * 0.4
    const bgWidth = textWidth + (bgPaddingX * 2)
    const bgHeight = fontSize + (bgPaddingY * 2)
    
    // Position at bottom right, closer to the edge
    const bgX = canvas.width - paddingX - bgWidth
    const bgY = canvas.height - paddingY - bgHeight

    // Draw semi-transparent background pill
    ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.75)' : 'rgba(255, 255, 255, 0.85)'
    ctx.beginPath()
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, fontSize * 0.3)
    ctx.fill()

    // Optional: add a very subtle border in light mode so it doesn't bleed into pure white backgrounds
    if (!isDark) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw the text
    ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.8)'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    // Magic number offset to vertically center standard fonts inside the pill
    ctx.fillText(text, bgX + bgPaddingX, bgY + bgPaddingY + (fontSize * 0.1))
    
    ctx.restore()

    const blob = await new Promise<Blob | null>((resolve) =>
      tempCanvas.toBlob(resolve, 'image/png')
    )
    if (!blob) return false

    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ])
      return true
    }

    // Fallback: download
    downloadBlob(blob, filename)
    return true
  } catch {
    return false
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function copyLinkToClipboard(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.href)
    return true
  } catch {
    return false
  }
}
