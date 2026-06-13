import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { tokenQrToDataUrl } from '@/lib/tokenQr'

function TokenQrCode({ token, size = 160, className = '' }) {
  const [dataUrl, setDataUrl] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setDataUrl(null)
    setError(false)

    tokenQrToDataUrl(token, 4)
      .then((url) => {
        if (!cancelled) setDataUrl(url)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [token?.token_number, token?.id])

  if (error) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 border rounded-lg text-xs text-gray-500 ${className}`}
        style={{ width: size, height: size }}
      >
        QR unavailable
      </div>
    )
  }

  if (!dataUrl) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 border rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <img
      src={dataUrl}
      alt={`QR code for token ${token?.token_number || ''}`}
      width={size}
      height={size}
      className={`rounded-lg border bg-white ${className}`}
    />
  )
}

export default TokenQrCode
