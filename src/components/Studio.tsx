import { downloadBlob, formatBytes, onDropZone } from '@chirag127/oz-file'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BeforeAfter from './BeforeAfter'
import CropOverlay from './CropOverlay'
import '../styles/studio.css'
import {
  type CropRect,
  type Fmt,
  type LoadedImage,
  convert,
  crop as cropOp,
  loadImage,
  resize as resizeOp,
  toDataURL,
} from '../lib/canvas'
import { renameForOp } from '../lib/imageMath'

type Tab = 'resize' | 'crop' | 'compress' | 'convert' | 'strip'

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'resize', label: 'Resize', desc: 'Scale by max box or percent' },
  { id: 'crop', label: 'Crop', desc: 'Drag a region to keep' },
  { id: 'compress', label: 'Compress', desc: 'Shrink file size to a target' },
  { id: 'convert', label: 'Convert', desc: 'PNG · JPEG · WebP' },
  { id: 'strip', label: 'Strip EXIF', desc: 'Remove all metadata + GPS' },
]

export default function Studio() {
  const [img, setImg] = useState<LoadedImage | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [beforeUrl, setBeforeUrl] = useState('')
  const [afterUrl, setAfterUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('') // scaled data url for crop overlay
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [tab, setTab] = useState<Tab>('resize')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // controls
  const [rMode, setRMode] = useState<'fit' | 'percent'>('fit')
  const [maxW, setMaxW] = useState(1600)
  const [maxH, setMaxH] = useState(1600)
  const [percent, setPercent] = useState(50)
  const [upscale, setUpscale] = useState(false)
  const [fmt, setFmt] = useState<Fmt>('jpeg')
  const [quality, setQuality] = useState(82)
  const [targetMB, setTargetMB] = useState(0.5)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)

  // AI
  const [aiBusy, setAiBusy] = useState(false)
  const [aiText, setAiText] = useState('')
  const [aiErr, setAiErr] = useState('')

  // bg removal
  const [bgBusy, setBgBusy] = useState(false)
  const [bgMsg, setBgMsg] = useState('')

  const dropRef = useRef<HTMLLabelElement>(null)

  const revoke = (u: string) => u && u.startsWith('blob:') && URL.revokeObjectURL(u)

  const accept = useCallback(async (f: File) => {
    if (!f.type.startsWith('image/')) {
      setErr('Not an image file.')
      return
    }
    setErr('')
    setAiText('')
    setAiErr('')
    setResultBlob(null)
    setAfterUrl((prev) => {
      revoke(prev)
      return ''
    })
    try {
      const loaded = await loadImage(f)
      setImg(loaded)
      setFile(f)
      setBeforeUrl((prev) => {
        revoke(prev)
        return URL.createObjectURL(f)
      })
      setPreviewUrl(await toDataURL(loaded, 900))
      if (loaded.width < 2400) setMaxW(Math.min(1600, loaded.width))
    } catch (e) {
      setErr(`Could not decode image: ${(e as Error).message}`)
    }
  }, [])

  useEffect(() => {
    const el = dropRef.current
    if (!el) return
    return onDropZone(el, (files) => files[0] && accept(files[0]))
  }, [accept])

  const outFmt: Fmt = tab === 'strip' && img ? guessFmt(img.type) : fmt

  const run = useCallback(async () => {
    if (!img || !file) return
    setBusy(true)
    setErr('')
    try {
      let blob: Blob
      if (tab === 'resize') {
        blob = await resizeOp(img, { mode: rMode, maxW, maxH, percent, upscale }, fmt, quality)
      } else if (tab === 'crop') {
        if (!cropRect) throw new Error('Draw a crop region first.')
        blob = await cropOp(img, cropRect, fmt, quality)
      } else if (tab === 'convert') {
        blob = await convert(img, fmt, quality)
      } else if (tab === 'strip') {
        // re-encode same format, full quality → drops EXIF/GPS
        blob = await convert(img, outFmt, 95)
      } else {
        // compress: lazy-load browser-image-compression
        const { default: imageCompression } = await import('browser-image-compression')
        blob = await imageCompression(file, {
          maxSizeMB: targetMB,
          useWebWorker: true,
          fileType: MIMEof(fmt),
          initialQuality: quality / 100,
          maxWidthOrHeight: Math.max(img.width, img.height),
        })
      }
      setResultBlob(blob)
      setAfterUrl((prev) => {
        revoke(prev)
        return URL.createObjectURL(blob)
      })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [img, file, tab, rMode, maxW, maxH, percent, upscale, fmt, quality, targetMB, cropRect, outFmt])

  const download = useCallback(() => {
    if (!resultBlob || !img) return
    const op = tab === 'strip' ? 'clean' : tab
    downloadBlob(resultBlob, renameForOp(img.name, tab === 'strip' ? outFmt : fmt, op))
  }, [resultBlob, img, tab, fmt, outFmt])

  const genAlt = useCallback(async () => {
    if (!img) return
    setAiBusy(true)
    setAiErr('')
    setAiText('')
    try {
      const { vision } = await import('@chirag127/oz-ai')
      const dataUrl = await toDataURL(img, 512, 'jpeg', 65)
      const out = await vision(
        'Write one concise, descriptive alt-text sentence (max 18 words) for this image. Plain text only, no quotes.',
        dataUrl,
      )
      setAiText(out.trim())
    } catch {
      setAiErr('AI unavailable right now — all providers busy. Core tools still work.')
    } finally {
      setAiBusy(false)
    }
  }, [img])

  const removeBg = useCallback(async () => {
    if (!file) return
    setBgBusy(true)
    setBgMsg('Loading model (~40 MB, first run only)…')
    try {
      const { removeBackground } = (await import(
        /* @vite-ignore */ 'https://esm.sh/@imgly/background-removal@1.7.0'
      )) as typeof import('@imgly/background-removal')
      setBgMsg('Cutting out subject…')
      const blob = await removeBackground(file)
      setResultBlob(blob)
      setFmt('png')
      setAfterUrl((prev) => {
        revoke(prev)
        return URL.createObjectURL(blob)
      })
      setBgMsg('')
    } catch (e) {
      setBgMsg(`Background removal failed: ${(e as Error).message}`)
    } finally {
      setBgBusy(false)
    }
  }, [file])

  const stats = useMemo(() => {
    if (!img || !resultBlob) return null
    const delta = img.size - resultBlob.size
    const pct = img.size ? Math.round((delta / img.size) * 100) : 0
    return { orig: img.size, out: resultBlob.size, pct }
  }, [img, resultBlob])

  return (
    <div className="studio">
      {!img && <Hero />}

      <label ref={dropRef} className="drop" htmlFor="file-in">
        <div className="drop__icon" aria-hidden="true">🎞️</div>
        <div>
          <strong>{img ? 'Load a different frame' : 'Drop an image or click to browse'}</strong>
          <div className="drop__hint">PNG · JPEG · WebP · GIF · BMP — never leaves your browser</div>
        </div>
        <input
          id="file-in"
          type="file"
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && accept(e.target.files[0])}
        />
      </label>

      {err && !img && <p className="err">{err}</p>}

      {img && (
        <div className="work">
          <div className="panel">
            <h2>Contact sheet</h2>
            {afterUrl && tab !== 'crop' ? (
              <BeforeAfter before={beforeUrl} after={afterUrl} alt={img.name} />
            ) : tab === 'crop' && previewUrl ? (
              <CropOverlay src={previewUrl} imgW={img.width} imgH={img.height} onChange={setCropRect} />
            ) : (
              <img className="preview" src={beforeUrl} alt={img.name} />
            )}
            <div className="meta">
              <span>
                <strong>{img.name}</strong> · {img.width}×{img.height}px · {formatBytes(img.size)}
              </span>
              {stats && (
                <span>
                  Result: <strong>{formatBytes(stats.out)}</strong>{' '}
                  {stats.pct > 0 ? <span className="savings">−{stats.pct}%</span> : stats.pct < 0 ? `+${-stats.pct}%` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="panel">
            <h2>Develop</h2>
            <div className="tabs" role="tablist" aria-label="Tools">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className="tab"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => {
                    setTab(t.id)
                    setResultBlob(null)
                    setAfterUrl((p) => {
                      revoke(p)
                      return ''
                    })
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Controls
              tab={tab}
              rMode={rMode}
              setRMode={setRMode}
              maxW={maxW}
              setMaxW={setMaxW}
              maxH={maxH}
              setMaxH={setMaxH}
              percent={percent}
              setPercent={setPercent}
              upscale={upscale}
              setUpscale={setUpscale}
              fmt={fmt}
              setFmt={setFmt}
              quality={quality}
              setQuality={setQuality}
              targetMB={targetMB}
              setTargetMB={setTargetMB}
              imgType={img.type}
            />

            <div className="actions">
              <button className="btn btn--primary" onClick={run} disabled={busy}>
                {busy ? <span className="spinner" /> : null} {busy ? ' Developing…' : label(tab)}
              </button>
              <button className="btn btn--ghost" onClick={download} disabled={!resultBlob}>
                ⬇ Download {resultBlob ? `(${formatBytes(resultBlob.size)})` : ''}
              </button>
            </div>
            {err && <p className="err">{err}</p>}

            <div className="ai">
              <strong>AI caption</strong>{' '}
              <button className="btn btn--ghost" onClick={genAlt} disabled={aiBusy} style={{ marginLeft: 8 }}>
                {aiBusy ? <span className="spinner" /> : '✨'} {aiBusy ? ' Thinking…' : ' Generate alt-text'}
              </button>
              {aiText && <p className="ai__out">“{aiText}”</p>}
              {aiErr && <p className="err">{aiErr}</p>}
            </div>

            <div className="ai" style={{ marginTop: '0.75rem' }}>
              <strong>Cut out background</strong>{' '}
              <span className="warn">(lazy · ~40 MB model, opt-in)</span>
              <div style={{ marginTop: 8 }}>
                <button className="btn btn--ghost" onClick={removeBg} disabled={bgBusy}>
                  {bgBusy ? <span className="spinner" /> : '✂️'} {bgBusy ? ' Working…' : ' Remove background'}
                </button>
              </div>
              {bgMsg && <p className="warn" style={{ marginTop: 6 }}>{bgMsg}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function label(tab: Tab): string {
  return tab === 'strip' ? 'Strip metadata' : tab === 'compress' ? 'Compress' : tab === 'crop' ? 'Apply crop' : tab === 'convert' ? 'Convert' : 'Resize'
}

function guessFmt(type: string): Fmt {
  if (type.includes('png')) return 'png'
  if (type.includes('webp')) return 'webp'
  return 'jpeg'
}
function MIMEof(f: Fmt): string {
  return f === 'png' ? 'image/png' : f === 'webp' ? 'image/webp' : 'image/jpeg'
}

function Hero() {
  return (
    <section className="hero">
      <span className="hero__kicker">Safelight on</span>
      <h1 className="hero__title">
        The <em>darkroom</em> for your images.
      </h1>
      <p className="hero__sub">
        Resize, crop, compress, convert and scrub EXIF — developed entirely in your browser. No upload, no signup, no
        pixel leaves this tab.
      </p>
      <div className="features">
        {TABS.map((t) => (
          <div className="feat" key={t.id}>
            <h3>{t.label}</h3>
            <p>{t.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

interface CtlProps {
  tab: Tab
  rMode: 'fit' | 'percent'
  setRMode: (v: 'fit' | 'percent') => void
  maxW: number
  setMaxW: (v: number) => void
  maxH: number
  setMaxH: (v: number) => void
  percent: number
  setPercent: (v: number) => void
  upscale: boolean
  setUpscale: (v: boolean) => void
  fmt: Fmt
  setFmt: (v: Fmt) => void
  quality: number
  setQuality: (v: number) => void
  targetMB: number
  setTargetMB: (v: number) => void
  imgType: string
}

function Controls(p: CtlProps) {
  const fmtSelect = (
    <div className="field">
      <label htmlFor="fmt">Output format</label>
      <select id="fmt" value={p.fmt} onChange={(e) => p.setFmt(e.target.value as Fmt)}>
        <option value="jpeg">JPEG (.jpg)</option>
        <option value="png">PNG (.png)</option>
        <option value="webp">WebP (.webp)</option>
      </select>
    </div>
  )
  const qualitySlider = p.fmt !== 'png' && (
    <div className="field">
      <label htmlFor="q">Quality — {p.quality}</label>
      <input id="q" type="range" min={1} max={100} value={p.quality} onChange={(e) => p.setQuality(+e.target.value)} />
    </div>
  )

  if (p.tab === 'resize')
    return (
      <>
        <div className="field">
          <label>Mode</label>
          <div className="tabs">
            <button className="tab" aria-selected={p.rMode === 'fit'} onClick={() => p.setRMode('fit')}>
              Fit box
            </button>
            <button className="tab" aria-selected={p.rMode === 'percent'} onClick={() => p.setRMode('percent')}>
              Percent
            </button>
          </div>
        </div>
        {p.rMode === 'fit' ? (
          <div className="row">
            <div className="field">
              <label htmlFor="mw">Max width (px)</label>
              <input id="mw" type="number" min={1} value={p.maxW} onChange={(e) => p.setMaxW(+e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="mh">Max height (px)</label>
              <input id="mh" type="number" min={1} value={p.maxH} onChange={(e) => p.setMaxH(+e.target.value)} />
            </div>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="pc">Scale — {p.percent}%</label>
            <input id="pc" type="range" min={1} max={300} value={p.percent} onChange={(e) => p.setPercent(+e.target.value)} />
          </div>
        )}
        <label className="check">
          <input type="checkbox" checked={p.upscale} onChange={(e) => p.setUpscale(e.target.checked)} /> Allow upscaling
        </label>
        {fmtSelect}
        {qualitySlider}
      </>
    )

  if (p.tab === 'crop')
    return (
      <>
        <p className="drop__hint">Drag the box on the preview; drag its corner to resize.</p>
        {fmtSelect}
        {qualitySlider}
      </>
    )

  if (p.tab === 'compress')
    return (
      <>
        <div className="field">
          <label htmlFor="tmb">Target size — {p.targetMB} MB</label>
          <input id="tmb" type="range" min={0.05} max={5} step={0.05} value={p.targetMB} onChange={(e) => p.setTargetMB(+e.target.value)} />
        </div>
        {fmtSelect}
        {qualitySlider}
        <p className="drop__hint">Uses browser-image-compression in a web worker (lazy-loaded on run).</p>
      </>
    )

  if (p.tab === 'convert')
    return (
      <>
        {fmtSelect}
        {qualitySlider}
      </>
    )

  // strip
  return (
    <p className="drop__hint">
      Re-encodes the image through canvas — dropping ALL EXIF, GPS, and camera metadata. Output keeps the original
      format ({guessFmt(p.imgType).toUpperCase()}) at high quality.
    </p>
  )
}
