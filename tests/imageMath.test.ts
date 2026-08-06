import { describe, expect, it } from 'vitest'
import { clampCrop, EXT, fitDimensions, MIME, qualityToUnit, renameForOp, scaleByPercent, stripsMetadata } from '../src/lib/imageMath'

describe('fitDimensions', () => {
  it('shrinks to fit box preserving aspect', () => {
    expect(fitDimensions(4000, 2000, 1000, 1000)).toEqual({ width: 1000, height: 500 })
  })
  it('does not upscale by default', () => {
    expect(fitDimensions(100, 100, 1000, 1000)).toEqual({ width: 100, height: 100 })
  })
  it('upscales when allowed', () => {
    expect(fitDimensions(100, 100, 400, 400, true)).toEqual({ width: 400, height: 400 })
  })
  it('never returns < 1px', () => {
    const r = fitDimensions(4000, 1, 10, 10)
    expect(r.height).toBeGreaterThanOrEqual(1)
  })
  it('handles zero input', () => {
    expect(fitDimensions(0, 0, 100, 100)).toEqual({ width: 0, height: 0 })
  })
})

describe('scaleByPercent', () => {
  it('50% halves', () => {
    expect(scaleByPercent(800, 600, 50)).toEqual({ width: 400, height: 300 })
  })
  it('100% unchanged', () => {
    expect(scaleByPercent(800, 600, 100)).toEqual({ width: 800, height: 600 })
  })
  it('floors at 1px', () => {
    expect(scaleByPercent(10, 10, 1)).toEqual({ width: 1, height: 1 })
  })
})

describe('clampCrop', () => {
  it('keeps in-bounds rect intact', () => {
    expect(clampCrop(10, 10, 50, 50, 200, 200)).toEqual({ x: 10, y: 10, width: 50, height: 50 })
  })
  it('clamps overflow width', () => {
    expect(clampCrop(180, 0, 100, 50, 200, 200)).toEqual({ x: 180, y: 0, width: 20, height: 50 })
  })
  it('clamps negative origin', () => {
    const r = clampCrop(-20, -20, 50, 50, 200, 200)
    expect(r.x).toBe(0)
    expect(r.y).toBe(0)
  })
})

describe('renameForOp', () => {
  it('swaps extension + tags op', () => {
    expect(renameForOp('beach.png', 'jpeg', 'resized')).toBe('beach-resized.jpg')
  })
  it('handles no extension', () => {
    expect(renameForOp('beach', 'webp', 'converted')).toBe('beach-converted.webp')
  })
})

describe('qualityToUnit', () => {
  it('maps 80 -> 0.8', () => {
    expect(qualityToUnit(80)).toBeCloseTo(0.8)
  })
  it('clamps range', () => {
    expect(qualityToUnit(0)).toBeCloseTo(0.01)
    expect(qualityToUnit(200)).toBe(1)
  })
})

describe('tables', () => {
  it('MIME + EXT cover all formats', () => {
    expect(MIME.jpeg).toBe('image/jpeg')
    expect(EXT.jpeg).toBe('jpg')
    expect(MIME.webp).toBe('image/webp')
  })
})

describe('stripsMetadata', () => {
  it('canvas re-encode always strips', () => {
    expect(stripsMetadata()).toBe(true)
  })
})
