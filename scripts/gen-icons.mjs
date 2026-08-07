import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const OUT = fileURLToPath(new URL('../public/icons/', import.meta.url))
await mkdir(OUT, { recursive: true })

const BG = '#0b0a09'
const AMBER = '#ffb347'
const ACCENT = '#e2571f'
const RED = '#d7261e'

// signature: darkroom enlarger lens — amber ring, red-orange develop dot, red satellite.
// pad = fraction of viewport reserved as empty border (maskable safe zone).
function mark({ size, pad = 0, rounded = true }) {
  const s = size
  const inset = s * pad
  const box = s - inset * 2
  const cx = inset + box * 0.5
  const cy = inset + box * 0.47
  const ring = box * 0.3
  const dot = box * 0.12
  const sat = box * 0.06
  const satX = cx + ring * 0.82
  const satY = cy - ring * 0.82
  const rx = rounded ? s * 0.18 : 0
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="glow" cx="72%" cy="18%" r="90%">
      <stop offset="0%" stop-color="${AMBER}" stop-opacity="0.22"/>
      <stop offset="55%" stop-color="${ACCENT}" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="${BG}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${s}" height="${s}" rx="${rx}" fill="${BG}"/>
  <rect width="${s}" height="${s}" rx="${rx}" fill="url(#glow)"/>
  <circle cx="${cx}" cy="${cy}" r="${ring}" fill="none" stroke="${AMBER}" stroke-width="${box * 0.055}"/>
  <circle cx="${cx}" cy="${cy}" r="${dot}" fill="${ACCENT}"/>
  <circle cx="${satX}" cy="${satY}" r="${sat}" fill="${RED}"/>
</svg>`
}

for (const size of [192, 256, 384, 512]) {
  await sharp(Buffer.from(mark({ size }))).png().toFile(join(OUT, `icon-${size}.png`))
}
await sharp(Buffer.from(mark({ size: 512, pad: 0.2, rounded: false }))).png().toFile(join(OUT, 'maskable-512.png'))
await sharp(Buffer.from(mark({ size: 180 }))).png().toFile(join(OUT, 'apple-touch-icon.png'))
await writeFile(join(OUT, 'icon.svg'), mark({ size: 512 }), 'utf8')
console.log('icons written to public/icons/')
