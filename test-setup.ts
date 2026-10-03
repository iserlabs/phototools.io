import '@testing-library/jest-dom'

// jsdom doesn't implement HTMLCanvasElement.getContext(). Tests for canvas-
// rendering components (Heatmap, FocalLength, GpsMap) attempt to call it and
// produce noisy "Not implemented" warnings. Stub it to a no-op 2D context so
// the tests can mount without polluting test output.
if (typeof HTMLCanvasElement !== 'undefined' && !HTMLCanvasElement.prototype.getContext.toString().includes('STUBBED')) {
  HTMLCanvasElement.prototype.getContext = function STUBBED(this: HTMLCanvasElement) {
    return {
      // Minimal CanvasRenderingContext2D surface used by our draw code.
      canvas: this,
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
      putImageData: () => {},
      createImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    } as unknown as CanvasRenderingContext2D
  } as unknown as typeof HTMLCanvasElement.prototype.getContext
}

// jsdom has no <dialog> behavior (HTMLDialogElement is an empty shell).
// Emulate the parts of the UA contract our native-dialog components rely on:
// showModal()/close() toggle `open` and fire `close`, showModal() moves focus
// into the dialog (the UA's dialog focusing steps), and Esc while a modal
// dialog is open is a close request. Focus containment and the close-time
// focus restoration are deliberately NOT emulated, so component tests still
// exercise our own focus-restore code.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  const escListeners = new WeakMap<HTMLDialogElement, (e: KeyboardEvent) => void>()
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !this.isConnected) return
      if (this.dispatchEvent(new Event('cancel', { cancelable: true }))) this.close()
    }
    escListeners.set(this, onKey)
    document.addEventListener('keydown', onKey)
    const target = this.querySelector<HTMLElement>('[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    target?.focus()
  }
  HTMLDialogElement.prototype.show = function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    if (!this.hasAttribute('open')) return
    const onKey = escListeners.get(this)
    if (onKey) document.removeEventListener('keydown', onKey)
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}
