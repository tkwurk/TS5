/**
 * Generates PWA PNG icons from public/favicon.svg using sharp.
 * Run: node scripts/generate-icons.cjs  (or: npm run icons)
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const root = path.resolve(__dirname, '..')
const svg = fs.readFileSync(path.join(root, 'public', 'favicon.svg'))
const out = (name) => path.join(root, 'public', name)
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 }
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

async function render(size, padFraction, background) {
  const inner = Math.round(size * (1 - padFraction * 2))
  const logo = await sharp(svg, { density: 512 })
    .resize(inner, inner, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer()
  const offset = Math.round((size - inner) / 2)
  return sharp({ create: { width: size, height: size, channels: 4, background: background || TRANSPARENT } })
    .composite([{ input: logo, top: offset, left: offset }])
    .png()
    .toBuffer()
}

async function write(name, size, pad, bg) {
  fs.writeFileSync(out(name), await render(size, pad, bg))
  console.log('wrote public/' + name + ' (' + size + 'x' + size + ')')
}

;(async () => {
  await write('pwa-192x192.png', 192, 0.08, TRANSPARENT)
  await write('pwa-512x512.png', 512, 0.08, TRANSPARENT)
  await write('maskable-512x512.png', 512, 0.18, WHITE) // 18% safe-zone padding
  await write('apple-touch-icon.png', 180, 0.12, WHITE) // opaque: iOS ignores transparency
  console.log('Done.')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
