import { formatCurrency, formatDateTime } from '@/lib/utils'

function buildReceiptHTML(bill) {
  const items = bill.items || []
  const payments = bill.payments || []

  const formatAmt = (amt) => formatCurrency(amt)

  // Group package items together, show non-package items individually
  const packageGroups = {}
  const standaloneItems = []

  items.forEach((item) => {
    // Items with notes containing a package name are expanded package services
    if (item.notes && items.filter((i) => i.notes === item.notes).length > 1) {
      const pkgName = item.notes
      if (!packageGroups[pkgName]) {
        packageGroups[pkgName] = { name: pkgName, total: 0, discount: 0 }
      }
      packageGroups[pkgName].total += item.total_price
      packageGroups[pkgName].discount += item.discount_amount || 0
    } else {
      standaloneItems.push(item)
    }
  })

  let itemRows = ''

  // Render package groups as single lines
  Object.values(packageGroups).forEach((pkg) => {
    itemRows += `
      <div style="margin-bottom:4px;">
        <div style="font-size:10px;">${pkg.name} (Package)</div>
        <div style="display:flex;justify-content:space-between;font-size:9px;">
          <span>1 x ${formatAmt(pkg.total)}</span>
          <span>${formatAmt(pkg.total)}</span>
        </div>`
    if (pkg.discount > 0) {
      itemRows += `
        <div style="font-size:8px;color:#666;">
          Disc: -${formatAmt(pkg.discount)}
        </div>`
    }
    itemRows += `</div>`
  })

  // Render standalone items
  standaloneItems.forEach((item) => {
    const name = item.item_name || 'Item'
    const typeLabel = item.item_type === 'product' ? ' (Product)' : ''
    const qty = item.quantity
    const unitPrice = item.unit_price
    const total = item.total_price
    const discount = item.discount_amount

    itemRows += `
      <div style="margin-bottom:4px;">
        <div style="font-size:10px;">${name}${typeLabel}</div>
        <div style="display:flex;justify-content:space-between;font-size:9px;">
          <span>${qty} x ${formatAmt(unitPrice)}</span>
          <span>${formatAmt(total)}</span>
        </div>`

    if (discount > 0) {
      itemRows += `
        <div style="font-size:8px;color:#666;">
          Disc: -${formatAmt(discount)}
        </div>`
    }

    itemRows += `</div>`
  })

  const paymentRows = payments
    .map(
      (p) => `
      <div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:2px;">
        <span>${p.payment_mode.toUpperCase()}</span>
        <span>${formatAmt(p.amount)}</span>
      </div>`
    )
    .join('')

  const branchName = bill.branch?.branch_name || ''
  const branchPhone = bill.branch?.phone || ''
  const branchAddress = bill.branch?.address || ''
  const billNumber = bill.bill_number || ''
  const billDate = bill.bill_date ? formatDateTime(bill.bill_date) : ''
  const customerName = bill.customer?.customer_name || ''
  const customerPhone = bill.customer?.phone_masked || bill.customer?.phone || ''
  const cashierName = bill.created_by?.full_name || ''
  const notes = bill.notes || ''

  const separator = `<div style="border-top:1px dashed #000;margin:6px 0;"></div>`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt ${billNumber}</title>
      <style>
        @page {
          size: 48mm auto;
          margin: 1mm;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 10px;
          width: 46mm;
          padding: 2mm;
          color: #000;
          line-height: 1.3;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .right { text-align: right; }
        .row {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <!-- Header -->
      <div class="center bold" style="font-size:13px;margin-bottom:2px;">
        ${branchName}
      </div>
      ${branchAddress ? `<div class="center" style="font-size:8px;margin-bottom:1px;">${branchAddress}</div>` : ''}
      ${branchPhone ? `<div class="center" style="font-size:9px;">Ph: ${branchPhone}</div>` : ''}

      ${separator}

      <!-- Bill Info -->
      <div style="font-size:9px;">
        <div>Bill #: ${billNumber}</div>
        <div>Date  : ${billDate}</div>
        <div>Customer: ${customerName}</div>
        ${customerPhone ? `<div>Phone: ${customerPhone}</div>` : ''}
      </div>

      ${separator}

      <div class="center bold" style="font-size:9px;margin-bottom:4px;">ITEMS</div>

      ${separator}

      <!-- Items -->
      ${itemRows}

      ${separator}

      <!-- Totals -->
      <div style="margin-bottom:2px;">
        <div class="row">
          <span>Subtotal:</span>
          <span>${formatAmt(bill.subtotal)}</span>
        </div>
        ${bill.discount_amount > 0 ? `
        <div class="row">
          <span>Discount:</span>
          <span>-${formatAmt(bill.discount_amount)}</span>
        </div>` : ''}
        ${bill.tax_amount > 0 ? `
        <div class="row">
          <span>Tax:</span>
          <span>${formatAmt(bill.tax_amount)}</span>
        </div>` : ''}
      </div>
      <div style="border-top:1px solid #000;margin:3px 0;"></div>
      <div class="total-row">
        <span>TOTAL:</span>
        <span>${formatAmt(bill.total_amount)}</span>
      </div>
      <div style="border-top:1px solid #000;margin:3px 0;"></div>

      ${separator}

      <!-- Payments -->
      <div class="center bold" style="font-size:9px;margin-bottom:4px;">PAYMENT</div>
      ${separator}
      ${paymentRows}

      ${separator}

      ${notes ? `
      <div style="font-size:8px;">
        Notes: ${notes}
      </div>
      ${separator}
      ` : ''}

      ${cashierName ? `<div style="font-size:8px;">Cashier: ${cashierName}</div>` : ''}

      <div class="center" style="margin-top:6px;font-size:9px;">
        Thank you for your visit!
      </div>
      <div class="center" style="font-size:8px;margin-top:1px;">
        See you again :)
      </div>
    </body>
    </html>
  `
}

export function printThermalReceipt(bill) {
  const html = buildReceiptHTML(bill)
  const printWindow = window.open('', '_blank')
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => {
    printWindow.print()
    printWindow.close()
  }, 300)
}
