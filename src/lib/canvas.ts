/**
 * Browser image ops via native canvas + createImageBitmap.
 * Every op re-encodes → EXIF/GPS metadata is stripped for free.
 */
import { MIME, type Fmt, clampCrop, fitDimensions, qualityToUnit, scaleByPercent } from './imageMath'

export interface LoadedImage {
  bitmap: ImageBitmap
  width: number
  height: number
  name: string
  type: string
  size: number
}

/** Decode a File into an ImageBitmap (respects EXIF orientation via imageOrientation). */
export async function loadImage(file: File): Promise<LoadedImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' as ImageOrientation })
  return { bitmap, width: bitmap.width, height: bitmap.height, name: file.name, type: file.type, size: file.size }
}

function drawTo(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  draw(ctx)
  return canvas
}

function toBlob(canvas: HTMLCanvasElement, fmt: Fmt, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`encode ${fmt} failed`))),
      MIME[fmt],
      fmt === 'png' ? undefined : qualityToUnit(quality),
    )
  })
}

/** Fill non-alpha formats with white so transparency doesn't render black. */
function background(ctx: CanvasRenderingContext2D, fmt: Fmt, w: number, h: number): void {
  if (fmt === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }
}

export interface ResizeOpts {
  mode: 'fit' | 'percent'
  maxW?: number
  maxH?: number
  percent?: number
  upscale?: boolean
}

export async function resize(img: LoadedImage, opts: ResizeOpts, fmt: Fmt, quality: number): Promise<Blob> {
  const { width, height } =
    opts.mode === 'percent'
      ? scaleByPercent(img.width, img.height, opts.percent ?? 100)
      : fitDimensions(img.width, img.height, opts.maxW ?? img.width, opts.maxH ?? img.height, opts.upscale)
  const canvas = drawTo(width, height, (ctx) => {
    background(ctx, fmt, width, height)
    ctx.drawImage(img.bitmap, 0, 0, width, height)
  })
  return toBlob(canvas, fmt, quality)
}

export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export async function crop(img: LoadedImage, rect: CropRect, fmt: Fmt, quality: number): Promise<Blob> {
  const c = clampCrop(rect.x, rect.y, rect.width, rect.height, img.width, img.height)
  const canvas = drawTo(c.width, c.height, (ctx) => {
    background(ctx, fmt, c.width, c.height)
    ctx.drawImage(img.bitmap, c.x, c.y, c.width, c.height, 0, 0, c.width, c.height)
  })
  return toBlob(canvas, fmt, quality)
}

/** Convert format (and optionally strip metadata) with no geometry change. */
export async function convert(img: LoadedImage, fmt: Fmt, quality: number): Promise<Blob> {
  const canvas = drawTo(img.width, img.height, (ctx) => {
    background(ctx, fmt, img.width, img.height)
    ctx.drawImage(img.bitmap, 0, 0)
  })
  return toBlob(canvas, fmt, quality)
}

/** A small data URL for AI vision / preview — longest side <= max px. */
export async function toDataURL(img: LoadedImage, max = 512, fmt: Fmt = 'jpeg', quality = 70): Promise<string> {
  const { width, height } = fitDimensions(img.width, img.height, max, max, false)
  const canvas = drawTo(width, height, (ctx) => {
    background(ctx, fmt, width, height)
    ctx.drawImage(img.bitmap, 0, 0, width, height)
  })
  return canvas.toDataURL(MIME[fmt], qualityToUnit(quality))
}
