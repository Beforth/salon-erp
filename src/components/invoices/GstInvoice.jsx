import { forwardRef } from 'react'
import { formatCurrency, formatDateStored } from '@/lib/utils'
import { groupTaxByRate, splitGstHalves } from '@/lib/gst'

/**
 * GST-compliant tax invoice (A4 print layout).
 * @param {{ bill: object }} props
 */
const GstInvoice = forwardRef(function GstInvoice({ bill }, ref) {
  if (!bill) return null

  const branch = bill.branch || {}
  const customer = bill.customer || {}
  const items = bill.items || []
  const taxRows = groupTaxByRate(items)
  const { cgst, sgst } = splitGstHalves(bill.tax_amount || 0)
  const sellerName = branch.legal_business_name || branch.branch_name || branch.name || 'Salon'
  const hasTax = (bill.tax_amount || 0) > 0

  const lineLabel = (item) => {
    if (item.item_name) return item.item_name
    if (item.service?.service_name) return item.service.service_name
    if (item.product?.product_name) return item.product.product_name
    if (item.package?.package_name) return item.package.package_name
    return 'Item'
  }

  const codeLabel = (item) => {
    if (!item.hsn_sac_code) return '—'
    return item.item_type === 'product' ? `HSN ${item.hsn_sac_code}` : `SAC ${item.hsn_sac_code}`
  }

  return (
    <div
      ref={ref}
      className="bg-white text-gray-900 p-8 max-w-[210mm] mx-auto text-sm print:p-6"
      id="gst-invoice-print"
    >
      <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold tracking-wide uppercase">Tax Invoice</h1>
        <p className="text-xs text-gray-600 mt-1">(Original for Recipient)</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Seller</p>
          <p className="font-bold text-base">{sellerName}</p>
          {branch.gstin && (
            <p className="mt-1">
              <span className="text-gray-500">GSTIN:</span>{' '}
              <span className="font-mono font-medium">{branch.gstin}</span>
            </p>
          )}
          {branch.address && <p className="text-gray-700 mt-1">{branch.address}</p>}
          {(branch.city || branch.state || branch.pincode) && (
            <p className="text-gray-700">
              {[branch.city, branch.state, branch.pincode].filter(Boolean).join(', ')}
            </p>
          )}
          {branch.phone && <p className="text-gray-600 mt-1">Ph: {branch.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Invoice details</p>
          <p>
            <span className="text-gray-500">Invoice No:</span>{' '}
            <span className="font-mono font-semibold">{bill.bill_number}</span>
          </p>
          <p className="mt-1">
            <span className="text-gray-500">Date:</span>{' '}
            {formatDateStored(bill.bill_date)}
          </p>
          {bill.book_number && (
            <p className="mt-1">
              <span className="text-gray-500">Book No:</span> {bill.book_number}
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 p-3 bg-gray-50 rounded-md border border-gray-200">
        <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Bill to</p>
        <p className="font-semibold">{customer.customer_name || 'Walk-in Customer'}</p>
        {customer.phone_masked && (
          <p className="text-gray-600 text-sm">Phone: {customer.phone_masked}</p>
        )}
      </div>

      <table className="w-full border-collapse mb-6 text-xs">
        <thead>
          <tr className="bg-gray-100 border-y border-gray-300">
            <th className="text-left py-2 px-2 w-8">#</th>
            <th className="text-left py-2 px-2">Description</th>
            <th className="text-center py-2 px-2 w-24">HSN/SAC</th>
            <th className="text-right py-2 px-2 w-10">Qty</th>
            <th className="text-right py-2 px-2 w-20">Rate</th>
            <th className="text-right py-2 px-2 w-16">Disc.</th>
            <th className="text-right py-2 px-2 w-20">Taxable</th>
            <th className="text-right py-2 px-2 w-14">GST%</th>
            <th className="text-right py-2 px-2 w-20">Tax</th>
            <th className="text-right py-2 px-2 w-24">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.item_id || index} className="border-b border-gray-200">
              <td className="py-2 px-2 text-gray-500">{index + 1}</td>
              <td className="py-2 px-2">
                <div className="font-medium">{lineLabel(item)}</div>
                <div className="text-gray-500 capitalize text-[10px]">{item.item_type}</div>
              </td>
              <td className="py-2 px-2 text-center font-mono text-[10px]">{codeLabel(item)}</td>
              <td className="py-2 px-2 text-right">{item.quantity}</td>
              <td className="py-2 px-2 text-right">{formatCurrency(item.unit_price)}</td>
              <td className="py-2 px-2 text-right text-red-600">
                {item.discount_amount > 0 ? `-${formatCurrency(item.discount_amount)}` : '—'}
              </td>
              <td className="py-2 px-2 text-right">
                {formatCurrency(item.taxable_amount ?? item.total_price)}
              </td>
              <td className="py-2 px-2 text-right">{item.tax_rate > 0 ? `${item.tax_rate}%` : '—'}</td>
              <td className="py-2 px-2 text-right">
                {item.tax_amount > 0 ? formatCurrency(item.tax_amount) : '—'}
              </td>
              <td className="py-2 px-2 text-right font-medium">
                {formatCurrency(item.total_price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end mb-8">
        <div className="w-72 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Gross subtotal</span>
            <span>{formatCurrency(bill.subtotal)}</span>
          </div>
          {(bill.discount_amount || 0) > 0 && (
            <div className="flex justify-between text-red-600">
              <span>Discount</span>
              <span>-{formatCurrency(bill.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Taxable value</span>
            <span>{formatCurrency(bill.taxable_subtotal ?? bill.subtotal - (bill.discount_amount || 0))}</span>
          </div>
          {hasTax && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-600">Total GST</span>
                <span>{formatCurrency(bill.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 pl-2">
                <span>CGST</span>
                <span>{formatCurrency(cgst)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 pl-2">
                <span>SGST</span>
                <span>{formatCurrency(sgst)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-900 pt-2 mt-2">
            <span>Grand Total</span>
            <span>{formatCurrency(bill.grand_total ?? bill.total_amount)}</span>
          </div>
        </div>
      </div>

      {hasTax && taxRows.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-2">Tax summary</p>
          <table className="w-full text-xs border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-1.5 px-2 border-b">GST Rate</th>
                <th className="text-right py-1.5 px-2 border-b">Taxable</th>
                <th className="text-right py-1.5 px-2 border-b">CGST</th>
                <th className="text-right py-1.5 px-2 border-b">SGST</th>
                <th className="text-right py-1.5 px-2 border-b">Total tax</th>
              </tr>
            </thead>
            <tbody>
              {taxRows.map((row) => {
                const half = splitGstHalves(row.tax_amount)
                return (
                  <tr key={row.tax_rate} className="border-b border-gray-200">
                    <td className="py-1.5 px-2">{row.tax_rate}%</td>
                    <td className="py-1.5 px-2 text-right">{formatCurrency(row.taxable_amount)}</td>
                    <td className="py-1.5 px-2 text-right">{formatCurrency(half.cgst)}</td>
                    <td className="py-1.5 px-2 text-right">{formatCurrency(half.sgst)}</td>
                    <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(row.tax_amount)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {bill.payments?.length > 0 && (
        <div className="mb-6 text-xs">
          <p className="font-semibold uppercase text-gray-500 mb-1">Payment</p>
          {bill.payments.map((p) => (
            <p key={p.payment_id} className="text-gray-700">
              {p.payment_mode?.toUpperCase()}: {formatCurrency(p.amount)}
            </p>
          ))}
        </div>
      )}

      <p className="text-[10px] text-gray-500 text-center border-t pt-4">
        This is a computer-generated tax invoice. Amount in words: payable as per grand total above.
      </p>
    </div>
  )
})

export default GstInvoice

/** Print a GST invoice DOM node in a new window. */
export function printGstInvoiceElement(element) {
  if (!element) return
  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Tax Invoice</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 0; padding: 16px; color: #111; }
          table { border-collapse: collapse; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>${element.innerHTML}</body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}
