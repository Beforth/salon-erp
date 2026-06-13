export const TOKEN_QR_PREFIX = 'SALONTOKEN:'

/** Payload encoded in the QR — scan at billing to load the token. */
export function buildTokenQrPayload(token) {
  const number = typeof token === 'string' ? token : token?.token_number
  if (!number) return ''
  return `${TOKEN_QR_PREFIX}${number}`
}

/** Parse scanned QR / pasted text into a token number for lookup. */
export function parseTokenQrPayload(raw) {
  const text = (raw || '').trim()
  if (!text) return ''

  if (text.startsWith(TOKEN_QR_PREFIX)) {
    return text.slice(TOKEN_QR_PREFIX.length).trim()
  }

  try {
    const parsed = JSON.parse(text)
    if (parsed?.token_number) return String(parsed.token_number).trim()
    if (parsed?.number) return String(parsed.number).trim()
  } catch {
    // plain text token number
  }

  return text
}

export async function tokenQrToDataUrl(token, scale = 4) {
  const text = buildTokenQrPayload(token)
  if (!text) return null

  const bwipjs = (await import('bwip-js/browser')).default
  const canvas = document.createElement('canvas')
  bwipjs.toCanvas(canvas, {
    bcid: 'qrcode',
    text,
    scale,
    includetext: false,
  })
  return canvas.toDataURL('image/png')
}
