import { useCallback, useRef, useState } from 'react'

interface Props {
  before: string
  after: string
  alt?: string
}

/** Signature darkroom before/after wipe slider. Pointer + keyboard driven. */
export default function BeforeAfter({ before, after, alt = 'preview' }: Props) {
  const [pos, setPos] = useState(50)
  const wrapRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const p = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(100, Math.max(0, p)))
  }, [])

  return (
    <div
      ref={wrapRef}
      className="ba"
      onPointerDown={(e) => {
        dragging.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        setFromClientX(e.clientX)
      }}
      onPointerMove={(e) => dragging.current && setFromClientX(e.clientX)}
      onPointerUp={() => {
        dragging.current = false
      }}
    >
      <img src={before} alt={`${alt} before`} />
      <div className="ba__after" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <img src={after} alt={`${alt} after`} />
      </div>
      <span className="ba__label ba__label--before">Original</span>
      <span className="ba__label ba__label--after">Result</span>
      <div
        className="ba__handle"
        style={{ left: `${pos}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Before/after comparison"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setPos((p) => Math.max(0, p - 4))
          if (e.key === 'ArrowRight') setPos((p) => Math.min(100, p + 4))
        }}
      >
        <span className="ba__grip" aria-hidden="true">
          ⇔
        </span>
      </div>
    </div>
  )
}
