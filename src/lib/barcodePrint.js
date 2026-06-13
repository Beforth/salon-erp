const DEFAULT_LABEL_SIZE = '50x25'

const SIZE_OPTIONS = [
  { value: '50x25', label: '50 × 25 mm' },
  { value: '38x25', label: '38 × 25 mm' },
  { value: '100x50', label: '100 × 50 mm' },
]

export { SIZE_OPTIONS, DEFAULT_LABEL_SIZE }

function parseSize(value) {
  const [w, h] = (value || DEFAULT_LABEL_SIZE).split('x').map(Number)
  return { w: w || 50, h: h || 25 }
}

function isCompactLabel(mmW, mmH) {
  return mmH <= 25 || mmW <= 50
}

async function renderBarcodeDataUrl(barcode, mmH) {
  const bwipjs = (await import('bwip-js/browser')).default
  const canvas = document.createElement('canvas')
  // Tuned so ~10-char Code 128 fits a 50×25 mm label readably.
  bwipjs.toCanvas(canvas, {
    bcid: 'code128',
    text: barcode,
    scale: 4,
    height: Math.max(10, Math.round(mmH * 0.55)),
    includetext: true,
    textxalign: 'center',
    textsize: 9,
    paddingwidth: 2,
    paddingheight: 2,
  })
  return canvas.toDataURL('image/png')
}

/**
 * Print one or more barcode labels.
 * @param {Array<{ barcode: string, title?: string }>} labels
 * @param {string} sizeKey - e.g. '50x25'
 */
export async function printBarcodeLabels(labels, sizeKey = DEFAULT_LABEL_SIZE) {
  const items = (labels || []).filter((l) => l?.barcode)
  if (items.length === 0) {
    throw new Error('No barcodes to print')
  }

  const { w: mmW, h: mmH } = parseSize(sizeKey)
  const compact = isCompactLabel(mmW, mmH)
  const dataUrlByBarcode = new Map()

  for (const item of items) {
    if (dataUrlByBarcode.has(item.barcode)) continue
    dataUrlByBarcode.set(item.barcode, await renderBarcodeDataUrl(item.barcode, mmH))
  }

  let labelHtml = ''
  for (const item of items) {
    const url = dataUrlByBarcode.get(item.barcode)
    const showTitle = !compact && item.title
    labelHtml += `
      <div class="lbl${showTitle ? ' with-title' : ''}">
        ${showTitle ? `<div class="title">${item.title}</div>` : ''}
        <img src="${url}" alt="${item.barcode}" />
      </div>`
  }

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Barcode labels</title>
        <style>
          @page { margin: 0; size: ${mmW}mm ${mmH}mm; }
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
          }
          .lbl {
            width: ${mmW}mm;
            height: ${mmH}mm;
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            break-after: page;
            padding: 1mm;
            overflow: hidden;
          }
          .lbl.with-title {
            flex-direction: column;
          }
          .title {
            font: 7px/1.2 sans-serif;
            text-align: center;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-bottom: 0.5mm;
            flex-shrink: 0;
          }
          .lbl img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .lbl.with-title img {
            height: auto;
            flex: 1;
            min-height: 0;
          }
          .lbl:last-child { page-break-after: auto; break-after: auto; }
        </style>
      </head>
      <body>${labelHtml}</body>
    </html>
  `

  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
    w.close()
  }, 400)
}

/** Print a single open-bottle label at 50×25 mm (barcode only — matches product label print). */
export async function printOpenBottleLabel(container, sizeKey = DEFAULT_LABEL_SIZE) {
  if (!container?.barcode) return
  await printBarcodeLabels([{ barcode: container.barcode }], sizeKey)
}
