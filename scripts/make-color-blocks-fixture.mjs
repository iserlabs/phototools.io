import { writeFileSync } from 'node:fs'
import jpeg from 'jpeg-js'

const width = 600, height = 400
const data = Buffer.alloc(width * height * 4)
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = (y * width + x) * 4
  const [r, g, b] = x < 200 ? [214, 40, 40] : x < 400 ? [40, 170, 90] : [40, 80, 220]
  data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255
}
const out = jpeg.encode({ data, width, height }, 92)
writeFileSync(new URL('../src/e2e/fixtures/color-blocks.jpg', import.meta.url), out.data)
console.log('wrote color-blocks.jpg', out.data.length, 'bytes')
