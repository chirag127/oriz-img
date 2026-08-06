/**
 * Pure image-math helpers — no DOM, unit-tested.
 * Canvas/browser ops live in canvas.ts (import()-ed by islands).
 */

export type Fmt = 'png' | 'jpeg' | 'webp'

export const MIME: Record<Fmt, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export const EXT: Record<Fmt, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

/** Fit (w,h) inside (maxW,maxH) preserving aspect ratio. Never upscales when upscale=false. */
export function fitDimensions(
  w: number,
  h: number,
  maxW: number,
  maxH: number,
  upscale = false,
): { width: number; height: number } {
  if (w <= 0 || h <= 0) return { width: 0, height: 0 }
  let scale = Math.min(maxW / w, maxH / h)
  if (!upscale) scale = Math.min(scale, 1)
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

/** Scale (w,h) by a percentage (100 = unchanged). */
export function scaleByPercent(w: number, h: number, percent: number): { width: number; height: number } {
  const p = Math.max(1, percent) / 100
  return { width: Math.max(1, Math.round(w * p)), height: Math.max(1, Math.round(h * p)) }
}

/** Clamp a crop rect to lie fully inside the source image bounds. */
export function clampCrop(
  x: number,
  y: number,
  w: number,
  h: number,
  imgW: number,
  imgH: number,
): { x: number; y: number; width: number; height: number } {
  const cx = Math.min(Math.max(0, Math.round(x)), imgW)
  const cy = Math.min(Math.max(0, Math.round(y)), imgH)
  const cw = Math.min(Math.max(1, Math.round(w)), imgW - cx)
  const ch = Math.min(Math.max(1, Math.round(h)), imgH - cy)
  return { x: cx, y: cy, width: cw, height: ch }
}

/** Replace a filename's extension with the target format's extension, tagging the op. */
export function renameForOp(name: string, fmt: Fmt, op: string): string {
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  return `${base}-${op}.${EXT[fmt]}`
}

/** JPEG/WebP quality slider (1–100) → canvas quality (0–1). PNG ignores quality. */
export function qualityToUnit(q: number): number {
  return Math.min(100, Math.max(1, q)) / 100
}

/**
 * Does re-encoding through <canvas> strip metadata?
 * Canvas never copies EXIF/GPS/orientation into its output — so any canvas
 * re-encode is a metadata strip. Only a byte-copy (fmt unchanged, no resize/crop)
 * would preserve it; we always re-encode, so this is always true here.
 */
export function stripsMetadata(): boolean {
  return true
}
