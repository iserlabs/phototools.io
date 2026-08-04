import sharp from 'sharp'

const [, , inPath, maskPath, outPath] = process.argv
if (!inPath || !maskPath || !outPath) { console.error('usage: slice.mjs <in.webp> <mask.svg> <out.webp>'); process.exit(1) }

const { width, height } = await sharp(inPath).metadata()
const mask = await sharp(maskPath).resize(width, height).png().toBuffer()
await sharp(inPath)
  .composite([{ input: mask, blend: 'dest-in' }])
  .webp({ quality: 90, alphaQuality: 90 })
  .toFile(outPath)
console.log('wrote', outPath)
