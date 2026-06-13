import { useEffect, useRef } from 'react'

/**
 * Renders a scannable Code 128 barcode on screen.
 */
export default function BarcodeImage({ value, className = '' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const text = String(value || '').trim()
    const canvas = canvasRef.current
    if (!text || !canvas) return

    let cancelled = false
    ;(async () => {
      try {
        const bwipjs = (await import('bwip-js/browser')).default
        if (cancelled) return
        bwipjs.toCanvas(canvas, {
          bcid: 'code128',
          text,
          scale: 3,
          height: 12,
          includetext: true,
          textxalign: 'center',
          textsize: 11,
        })
      } catch {
        // ignore render errors
      }
    })()

    return () => {
      cancelled = true
    }
  }, [value])

  if (!value) return null

  return (
    <canvas
      ref={canvasRef}
      className={`max-w-full h-auto ${className}`}
      aria-label={`Barcode ${value}`}
    />
  )
}
