import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Loader2, Printer, Search, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

function parseSize(value) {
  const [w, h] = (value || '50x25').split('x').map(Number)
  return { w: w || 50, h: h || 25 }
}

export default function BarcodePrintPage() {
  const [search, setSearch] = useState('')
  const [qtyById, setQtyById] = useState({})  // product_id → integer qty
  const [printing, setPrinting] = useState(false)
  const [sizeOverride, setSizeOverride] = useState(null)

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', { for: 'barcode-print' }],
    queryFn: () => productService.getProducts({ is_active: 'true', limit: 500 }),
  })
  const products = productsData?.data || []

  const { data: sizeSetting } = useQuery({
    queryKey: ['setting', 'barcode.label_size'],
    queryFn: () => settingsService.getSetting('barcode.label_size'),
  })
  const defaultSize = sizeSetting?.data?.value || sizeSetting?.data?.setting_value || '50x25'
  const activeSize = sizeOverride || defaultSize

  const filtered = useMemo(() => {
    const q = (search || '').trim()
    if (!q) return products
    return products.filter((p) =>
      fuzzyMatch(p.product_name || '', q) ||
      fuzzyMatch(p.barcode || '', q) ||
      fuzzyMatch(p.brand || '', q) ||
      fuzzyMatch(p.parent_sku?.name || '', q)
    )
  }, [products, search])

  const setQty = (id, n) => {
    const v = Math.max(0, parseInt(n, 10) || 0)
    setQtyById((prev) => ({ ...prev, [id]: v }))
  }

  const totalLabels = Object.values(qtyById).reduce((s, n) => s + (n || 0), 0)

  const handlePrint = async () => {
    const targets = products
      .map((p) => ({ p, qty: qtyById[p.product_id] || 0 }))
      .filter((x) => x.qty > 0 && x.p.barcode)

    if (targets.length === 0) {
      toast.error('Set qty > 0 on at least one product with a barcode')
      return
    }

    setPrinting(true)
    try {
      const bwipjs = (await import('bwip-js/browser')).default
      const { w: mmW, h: mmH } = parseSize(activeSize)

      // Render each unique barcode once to a PNG dataURL, then duplicate in HTML.
      const dataUrlByBarcode = new Map()
      for (const { p } of targets) {
        if (dataUrlByBarcode.has(p.barcode)) continue
        const canvas = document.createElement('canvas')
        // Scale: tuned so ~10-char Code 128 fits a 50×25mm label readably.
        bwipjs.toCanvas(canvas, {
          bcid: 'code128',
          text: p.barcode,
          scale: 3,
          height: Math.max(8, Math.round(mmH * 0.5)),
          includetext: true,
          textxalign: 'center',
          textsize: 8,
        })
        dataUrlByBarcode.set(p.barcode, canvas.toDataURL('image/png'))
      }

      let labelHtml = ''
      for (const { p, qty } of targets) {
        const url = dataUrlByBarcode.get(p.barcode)
        for (let i = 0; i < qty; i += 1) {
          labelHtml += `
            <div class="lbl">
              <img src="${url}" />
            </div>`
        }
      }

      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Barcode labels</title>
            <style>
              @page { margin: 0; size: ${mmW}mm ${mmH}mm; }
              html, body {
                margin: 0;
                padding: 0;
                width: ${mmW}mm;
                height: ${mmH}mm;
                overflow: hidden;
              }
              .lbl {
                width: ${mmW}mm;
                height: ${mmH}mm;
                display: flex;
                align-items: center;
                justify-content: center;
                page-break-after: always;
                break-after: page;
                box-sizing: border-box;
                padding: 1mm;
                overflow: hidden;
              }
              .lbl img {
                display: block;
                width: 100%;
                height: 100%;
                object-fit: contain;
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
    } catch (err) {
      console.error('Barcode print failed:', err)
      toast.error('Failed to print labels — see console for details')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/products" className="text-xs text-gray-500 hover:underline inline-flex items-center gap-1 mb-1">
            <ArrowLeft className="h-3 w-3" /> Products
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Print Barcodes</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Set quantity for each product and click Print. Labels render at the configured size — change the global default in Settings.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Active size:&nbsp;
            <select
              value={activeSize}
              onChange={(e) => setSizeOverride(e.target.value)}
              className="h-8 px-2 border rounded-md text-sm"
            >
              {SIZE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            {sizeOverride && sizeOverride !== defaultSize && (
              <button onClick={() => setSizeOverride(null)} className="ml-1 text-xs text-primary hover:underline">reset</button>
            )}
          </div>
          <Button onClick={handlePrint} disabled={printing || totalLabels === 0}>
            {printing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            Print {totalLabels > 0 ? `(${totalLabels})` : ''}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="py-3 px-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by product name, barcode, brand, or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No products match.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="w-[120px] text-right">Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.product_id}>
                    <TableCell>
                      <div className="font-medium">{p.product_name}</div>
                      <div className="text-xs text-gray-500">{p.brand || ''}</div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {p.parent_sku?.name || '—'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {p.barcode || <span className="text-rose-600">missing</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={qtyById[p.product_id] ?? ''}
                        onChange={(e) => setQty(p.product_id, e.target.value)}
                        placeholder="0"
                        className="w-20 text-right ml-auto"
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
