import { formatDateTimeStored } from '@/lib/utils'
import { tokenQrToDataUrl } from '@/lib/tokenQr'

/** Mask a phone the same way the BE does for display: 98***43***. */
function maskPhone(phone) {
  if (!phone) return ''
  const p = String(phone).replace(/\s+/g, '')
  if (p.length < 10) return p
  return `${p.substring(0, 2)}***${p.substring(5, 7)}***`
}

function buildTokenSlipHTML(token, qrDataUrl = null) {
  const items = token.services_requested || []
  const branchName = token.branch?.name || ''
  const issuedAt = token.created_at ? formatDateTimeStored(token.created_at) : ''
  const maskedPhone = maskPhone(token.customer_phone_snap)
  const customerLine = `${token.customer_name_snap || ''}${maskedPhone ? ` · ${maskedPhone}` : ''}`

  // Support both legacy ({service_name}) and new ({kind, name}) shapes.
  const itemLabel = (it) => {
    const name = it.name || it.service_name || ''
    return it.kind === 'package' ? `[Pkg] ${name}` : name
  }
  const servicesHtml = items.length
    ? `<div class="services">${items.map((it) => `<div>• ${itemLabel(it)}</div>`).join('')}</div>`
    : ''

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Token ${token.token_number}</title>
        <style>
          @page { margin: 0; size: 80mm auto; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            margin: 0;
            padding: 8px 6px;
            width: 76mm;
          }
          .center { text-align: center; }
          .branch { font-size: 11px; }
          .number {
            font-size: 38px;
            font-weight: 800;
            letter-spacing: 1px;
            margin: 6px 0;
          }
          .customer { font-size: 13px; margin: 4px 0 2px; }
          .meta { font-size: 9px; color: #444; }
          .services {
            margin-top: 8px;
            border-top: 1px dashed #888;
            padding-top: 6px;
            text-align: left;
            font-size: 11px;
          }
          .footer {
            margin-top: 10px;
            font-size: 9px;
            border-top: 1px dashed #888;
            padding-top: 4px;
          }
          .testing {
            margin-top: 8px;
            padding: 6px 4px;
            border: 1px dashed #b45309;
            background: #fffbeb;
            color: #92400e;
            font-size: 9px;
            line-height: 1.35;
            text-align: center;
          }
          .qr {
            margin: 8px auto 4px;
            width: 120px;
            height: 120px;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="center branch">${branchName}</div>
        <div class="center number">${token.token_number}</div>
        ${qrDataUrl ? `<img class="qr" src="${qrDataUrl}" alt="Token QR" />` : ''}
        <div class="center customer">${customerLine}</div>
        <div class="center meta">${issuedAt}</div>
        ${servicesHtml}
        <div class="testing">
          <strong>Testing mode</strong><br />
          Tokens are new — you may hit issues loading services or packages at billing.
          Sorry for the inconvenience; please ask staff for help if anything looks wrong.
        </div>
        <div class="center footer">Scan QR or show this token at billing</div>
      </body>
    </html>
  `
}

export async function printTokenSlip(token) {
  const qrDataUrl = await tokenQrToDataUrl(token).catch(() => null)
  const html = buildTokenSlipHTML(token, qrDataUrl)
  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
    w.close()
  }, 300)
}

export default printTokenSlip
