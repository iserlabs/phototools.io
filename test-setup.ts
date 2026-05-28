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
