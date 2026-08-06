import { useCallback, useEffect, useRef, useState } from 'react'
import type { CropRect } from '../lib/canvas'

interface Props {
  src: string
  imgW: number
  imgH: number
  onChange: (rect: CropRect) => void
}

/** Draggable/resizable crop box overlaid on a scaled preview. Emits crop rect in SOURCE pixels. */
export default function CropOverlay({ src, imgW, imgH, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 }) // fractions
  const mode = useRef<'none' | 'move' | 'resize'>('none')
  const start = useRef({ mx: 0, my: 0, bx: 0, by: 0, bw: 0, bh: 0 })

  const emit = useCallback(
    (b: typeof box) => {
      onChange({
        x: Math.round(b.x * imgW),
        y: Math.round(b.y * imgH),
        width: Math.round(b.w * imgW),
        height: Math.round(b.h * imgH),
      })
    },
    [imgW, imgH, onChange],
  )

  useEffect(() => {
    emit(box)
  }, []) // initial

  const frac = (clientX: number, clientY: number) => {
    const el = wrapRef.current
    if (!el) return { fx: 0, fy: 0 }
    const r = el.getBoundingClientRect()
    return { fx: (clientX - r.left) / r.width, fy: (clientY - r.top) / r.height }
  }

  const onMove = (e: PointerEvent) => {
    if (mode.current === 'none') return
    const el = wrapRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - start.current.mx) / r.width
    const dy = (e.clientY - start.current.my) / r.height
    setBox((prev) => {
      let next = { ...prev }
      if (mode.current === 'move') {
        next.x = Math.min(Math.max(0, start.current.bx + dx), 1 - prev.w)
        next.y = Math.min(Math.max(0, start.current.by + dy), 1 - prev.h)
      } else {
        next.w = Math.min(Math.max(0.05, start.current.bw + dx), 1 - prev.x)
        next.h = Math.min(Math.max(0.05, start.current.bh + dy), 1 - prev.y)
      }
      emit(next)
      return next
    })
  }
  const onUp = () => {
    mode.current = 'none'
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  const begin = (m: 'move' | 'resize', e: React.PointerEvent) => {
    e.stopPropagation()
    mode.current = m
    start.current = { mx: e.clientX, my: e.clientY, bx: box.x, by: box.y, bw: box.w, bh: box.h }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div ref={wrapRef} className="cropwrap">
      <img className="preview" src={src} alt="crop source" />
      <div
        className="cropbox"
        style={{
          left: `${box.x * 100}%`,
          top: `${box.y * 100}%`,
          width: `${box.w * 100}%`,
          height: `${box.h * 100}%`,
        }}
        onPointerDown={(e) => begin('move', e)}
      >
        <div className="crophandle" onPointerDown={(e) => begin('resize', e)} />
      </div>
    </div>
  )
}
