import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Loader2, Printer, Search, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { productService } from '@/services/product.service'
import { settingsService } from '@/services/settings.service'
import { fuzzyMatch } from '@/lib/utils'

const SIZE_OPTIONS = [
  { value: '50x25', label: '50 × 25 mm' },
  { value: '38x25', label: '38 × 25 mm' },
  { value: '100x50', label: '100 × 50 mm' },
]

const THERMAL_DPI = 203
const MM_PER_IN = 25.4
const LABEL_PAD_MM = 1

function parseSize(value) {
  const [w, h] = (value || '50x25').split('x').map(Number)
  return { w: w || 50, h: h || 25 }
}

function mmToPx(mm, dpi = THERMAL_DPI) {
  return Math.round((mm * dpi) / MM_PER_IN)
}

function renderBarcodeForLabel(bwipjs, text, mmW, mmH) {
  const probe = document.createElement('canvas')

  let scale = 2
  let height = 7
  let textSize = 8
  let textOffset = 12

  // Size specific tuning
  if (mmW === 38) {
    scale = 1
    height = 5
    textSize = 6
    textOffset = 10
  }

  if (mmW === 100) {
    scale = 3
    height = 12
    textSize = 12
    textOffset = 18
  }

  bwipjs.toCanvas(probe, {
  bcid: /^\d+$/.test(String(text))
    ? 'ean13'
    : 'code128',

  text: String(text),

  // Better realistic size
  scale: mmW === 50 ? 1.6 : mmW === 38 ? 1 : 2.5,
  height: mmW === 50 ? 6 : mmW === 38 ? 5 : 10,

  includetext: true,
  textxalign: 'center',

  // Realistic text look
  textfont: 'monospace',
  textsize: mmW === 50 ? 6 : 5,

  // Text immediately below barcode
  textyoffset: -1,

  // Small realistic spacing
  paddingtop: 1,
  paddingbottom: 1,
  paddingleft: 1,
  paddingright: 1,

  backgroundcolor: 'FFFFFF',
  monochrome: true,
})

return {
  dataUrl: probe.toDataURL('image/png'),
  widthMm: mmW - 10,
  heightMm: mmH - 10,
}
}


function buildPrintDocumentHtml(labelHtml, mmW, mmH) {
  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Barcode Labels</title>

<style>
@page {
  size: ${mmW}mm ${mmH}mm;
  margin: 0;
}

html, body {
  margin: 0;
  padding: 0;
  width: ${mmW}mm;
  height: auto;
  overflow: hidden;
}

* {
  box-sizing: border-box;
}

.lbl {
  width: ${mmW}mm;
  height: ${mmH}mm;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  page-break-after: always;
  break-after: page;
  padding: ${LABEL_PAD_MM}mm;
}

.lbl img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.lbl:last-child {
  page-break-after: auto;
}

@media print {
  body {
    margin: 0;
    padding: 0;
  }

  .lbl {
    page-break-inside: avoid;
  }
}
</style>
</head>

<body>
${labelHtml}
</body>
</html>`
}

export default function BarcodePrintPage() {
  const [search, setSearch] = useState('')
  const [qtyById, setQtyById] = useState({})
  const [printing, setPrinting] = useState(false)
  const [sizeOverride, setSizeOverride] = useState(null)

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', { for: 'barcode-print' }],
    queryFn: () =>
      productService.getProducts({
        is_active: 'true',
        limit: 500,
      }),
  })

  const products = productsData?.data || []

  const { data: sizeSetting } = useQuery({
    queryKey: ['setting', 'barcode.label_size'],
    queryFn: () =>
      settingsService.getSetting('barcode.label_size'),
  })

  const defaultSize =
    sizeSetting?.data?.value ||
    sizeSetting?.data?.setting_value ||
    '50x25'

  const activeSize = sizeOverride || defaultSize

  const filtered = useMemo(() => {
    const q = (search || '').trim()

    if (!q) return products

    return products.filter(
      (p) =>
        fuzzyMatch(p.product_name || '', q) ||
        fuzzyMatch(p.barcode || '', q) ||
        fuzzyMatch(p.brand || '', q) ||
        fuzzyMatch(p.parent_sku?.name || '', q)
    )
  }, [products, search])

  const setQty = (id, n) => {
    const value = Math.max(0, parseInt(n, 10) || 0)

    setQtyById((prev) => ({
      ...prev,
      [id]: value,
    }))
  }

  const totalLabels = Object.values(qtyById).reduce(
    (sum, qty) => sum + (qty || 0),
    0
  )

    const handlePrint = async () => {
    const targets = products
      .map((p) => ({
        p,
        qty: qtyById[p.product_id] || 0,
      }))
      .filter((x) => x.qty > 0 && x.p.barcode)

    if (targets.length === 0) {
      toast.error(
        'Set qty > 0 on at least one product with barcode'
      )
      return
    }

    setPrinting(true)

    try {
      const bwipjs =
        (await import('bwip-js/browser')).default

      const { w: mmW, h: mmH } =
        parseSize(activeSize)

      const renderedByBarcode = new Map()

      for (const { p } of targets) {
        if (renderedByBarcode.has(p.barcode))
          continue

        renderedByBarcode.set(
          p.barcode,
          renderBarcodeForLabel(
            bwipjs,
            p.barcode,
            mmW,
            mmH
          )
        )
      }

      let labelHtml = ''

      for (const { p, qty } of targets) {
        const rendered =
          renderedByBarcode.get(p.barcode)

        for (let i = 0; i < qty; i++) {
          labelHtml += `
            <div class="lbl">
              <img
                src="${rendered.dataUrl}"
                alt="barcode"
              />
            </div>
          `
        }
      }

      const html = buildPrintDocumentHtml(
        labelHtml,
        mmW,
        mmH
      )

      const printWindow = window.open(
        '',
        '_blank'
      )

      if (!printWindow) {
        toast.error(
          'Popup blocked. Allow popups.'
        )
        return
      }

      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()

      const waitForImages = () => {
        const images = [
          ...printWindow.document.images,
        ]

        if (images.length === 0) {
          printWindow.focus()
          printWindow.print()
          setTimeout(
            () => printWindow.close(),
            300
          )
          return
        }

        let loaded = 0

        const done = () => {
          loaded++

          if (loaded === images.length) {
            setTimeout(() => {
              printWindow.focus()
              printWindow.print()

              setTimeout(
                () => printWindow.close(),
                300
              )
            }, 300)
          }
        }

        images.forEach((img) => {
          if (img.complete) {
            done()
          } else {
            img.onload = done
            img.onerror = done
          }
        })
      }

      printWindow.onload = waitForImages

      setTimeout(waitForImages, 800)
    } catch (err) {
      console.error(err)

      toast.error(
        'Barcode printing failed'
      )
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            to="/products"
            className="text-xs text-gray-500 hover:underline inline-flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Products
          </Link>

          <h1 className="text-2xl font-bold text-gray-900">
            Print Barcodes
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Select barcode size and quantity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeSize}
            onChange={(e) =>
              setSizeOverride(e.target.value)
            }
            className="h-10 px-3 border rounded-md"
          >
            {SIZE_OPTIONS.map((s) => (
              <option
                key={s.value}
                value={s.value}
              >
                {s.label}
              </option>
            ))}
          </select>

          <Button
            onClick={handlePrint}
            disabled={
              printing || totalLabels === 0
            }
          >
            {printing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}

            Print
            {totalLabels > 0
              ? ` (${totalLabels})`
              : ''}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-3 px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />

            <Input
              placeholder="Search product or barcode..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    Product
                  </TableHead>

                  <TableHead>
                    SKU
                  </TableHead>

                  <TableHead>
                    Barcode
                  </TableHead>

                  <TableHead className="text-right">
                    Qty
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.map((p) => (
                  <TableRow
                    key={p.product_id}
                  >
                    <TableCell>
                      <div className="font-medium">
                        {p.product_name}
                      </div>

                      <div className="text-xs text-gray-500">
                        {p.brand || ''}
                      </div>
                    </TableCell>

                    <TableCell>
                      {p.parent_sku?.name ||
                        '—'}
                    </TableCell>

                    <TableCell className="font-mono">
                      {p.barcode || (
                        <span className="text-red-500">
                          missing
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={
                          qtyById[
                            p.product_id
                          ] ?? ''
                        }
                        onChange={(e) =>
                          setQty(
                            p.product_id,
                            e.target.value
                          )
                        }
                        className="w-20 ml-auto text-right"
                        disabled={!p.barcode}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

