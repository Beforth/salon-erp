/** Client-side GST totals — mirrors salon-erp-be/src/utils/tax.helper.js */

export function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

function lineGrossTaxable(line) {
  const gross = Number(line.unitPrice ?? line.unit_price) * Number(line.quantity)
  const lineDiscount = Number(line.discountAmount ?? line.discount_amount) || 0
  const taxable = Math.max(0, round2(gross - lineDiscount))
  const taxRate = Number(line.taxRate ?? line.tax_rate) || 0
  return { gross: round2(gross), taxable, taxRate }
}

export function computeBillTaxTotals(items, billDiscountAmount = 0) {
  const billDisc = Number(billDiscountAmount) || 0
  const baseLines = items.map((item) => {
    const { gross, taxable, taxRate } = lineGrossTaxable(item)
    return {
      ...item,
      gross,
      preBillTaxable: taxable,
      taxRate,
      discountAmount: Number(item.discountAmount ?? item.discount_amount) || 0,
    }
  })

  const grossSubtotal = baseLines.reduce((sum, line) => sum + line.gross, 0)
  const itemsDiscount = baseLines.reduce((sum, line) => sum + line.discountAmount, 0)
  const preBillTaxableTotal = baseLines.reduce((sum, line) => sum + line.preBillTaxable, 0)

  const lines = baseLines.map((line) => {
    const billShare =
      preBillTaxableTotal > 0
        ? round2((line.preBillTaxable / preBillTaxableTotal) * billDisc)
        : 0
    const taxableAmount = Math.max(0, round2(line.preBillTaxable - billShare))
    const taxAmount = round2((taxableAmount * line.taxRate) / 100)
    const totalPrice = round2(taxableAmount + taxAmount)

    return {
      ...line,
      taxableAmount,
      taxAmount,
      totalPrice,
    }
  })

  const taxableSubtotal = round2(lines.reduce((sum, line) => sum + line.taxableAmount, 0))
  const taxAmount = round2(lines.reduce((sum, line) => sum + line.taxAmount, 0))
  const totalAmount = round2(taxableSubtotal + taxAmount)

  return {
    lines,
    subtotal: round2(grossSubtotal),
    itemsDiscount: round2(itemsDiscount),
    taxableSubtotal,
    discountAmount: round2(itemsDiscount + billDisc),
    taxAmount,
    totalAmount,
  }
}

export function splitGstHalves(taxAmount) {
  const tax = round2(taxAmount)
  const half = round2(tax / 2)
  return { cgst: half, sgst: round2(tax - half) }
}

export function groupTaxByRate(items) {
  const map = new Map()
  for (const item of items || []) {
    const rate = Number(item.tax_rate ?? item.taxRate) || 0
    if (rate <= 0) continue
    const key = String(rate)
    const row = map.get(key) || { tax_rate: rate, taxable_amount: 0, tax_amount: 0 }
    row.taxable_amount = round2(row.taxable_amount + (Number(item.taxable_amount) || 0))
    row.tax_amount = round2(row.tax_amount + (Number(item.tax_amount) || 0))
    map.set(key, row)
  }
  return Array.from(map.values()).sort((a, b) => a.tax_rate - b.tax_rate)
}
