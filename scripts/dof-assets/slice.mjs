import sharp from 'sharp'

const [, , inPath, maskPath, outPath] = process.argv
if (!inPath || !maskPath || !outPath) { console.error('usage: slice.mjs <in.webp> <mask.svg> <out.webp>'); process.exit(1) }

const { data, info } = await sharp(inPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const maskLum = await sharp(maskPath).resize(info.width, info.height).removeAlpha().toColourspace('b-w').raw().toBuffer()
for (let i = 0; i < maskLum.length; i++) data[i * 4 + 3] = Math.min(data[i * 4 + 3], maskLum[i])
await sharp(data, { raw: info }).webp({ quality: 90, alphaQuality: 90 }).toFile(outPath)
console.log('wrote', outPath)
