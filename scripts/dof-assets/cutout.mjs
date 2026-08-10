import sharp from 'sharp'

const [, , inPath, outPath] = process.argv
if (!inPath || !outPath) { console.error('usage: cutout.mjs <in> <out.webp>'); process.exit(1) }

const { data, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
for (let i = 0; i < data.length; i += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  if (g > 150 && g > r * 1.5 && g > b * 1.5) {
    data[i + 3] = 0 // key out green
  } else if (g > Math.max(r, b)) {
    data[i + 1] = Math.max(r, b) // despill green fringe on kept pixels
  }
}
// 1px alpha feather: box-blur only the alpha channel
const alpha = await sharp(data, { raw: info }).extractChannel(3).blur(1).toBuffer()
for (let i = 0; i < alpha.length; i++) data[i * 4 + 3] = Math.min(data[i * 4 + 3], alpha[i])
await sharp(data, { raw: info }).webp({ quality: 90, alphaQuality: 90 }).toFile(outPath)
console.log('wrote', outPath)
