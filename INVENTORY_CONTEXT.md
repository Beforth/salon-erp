# Inventory Context

## What Changed

### Backend fixes

- Pending bills now reserve product stock using `reserved_quantity`.
- Bill completion now releases reserved stock, decrements actual stock, and writes a `sale` row in `inventory_transactions`.
- Bill cancellation releases reserved stock.
- Stock checks now use:

```text
available = quantity - reserved_quantity
```

- Stock transfer approval no longer creates cash income or salon expense entries.
- Stock transfer approval now only moves inventory and writes `transfer_out` / `transfer_in` audit records.
- Stock updates now lock inventory rows using `SELECT ... FOR UPDATE` in critical paths:
  - bill stock consumption
  - stock reservation
  - stock transfer approval
  - manual stock adjustment
  - purchase auto-add inventory
- Low-stock logic now works per location using available stock instead of global product total.
- Inventory reports now include reserved and available quantities.

### Frontend changes

- `Inventory` page was redesigned as `Inventory Control`.
- Added summary cards:
  - `On Hand`
  - `Reserved`
  - `Available`
  - `Low Stock Rows`
- Stock table now shows location-wise stock:

```text
Product | Location | On Hand | Reserved | Available | Status
```

- Low-stock alerts now show the affected location.
- Stock adjustment now requires a reason.
- Stock transfer creation was moved to the dedicated `Stock Transfers` page.
- Stock transfer UI no longer says warehouse-to-salon transfers create income/expense.

## Important Inventory Concepts

### Inventory

Inventory is the stock control area. It shows how much stock exists at each location.

Use `Available`, not `On Hand`, when deciding whether stock can be sold or transferred.

```text
Available = On Hand - Reserved
```

### SKUs

SKU is the parent grouping for product variants.

Example:

```text
SKU: L'Oreal Shampoo
Products:
- L'Oreal Shampoo 100ml
- L'Oreal Shampoo 250ml
- L'Oreal Shampoo 500ml
```

### Products

Products are the actual sellable or stockable items.

Products are used in:

- billing
- inventory
- purchase batches
- stock transfers
- barcode printing
- low-stock alerts

Important product fields:

- barcode
- SKU / parent SKU
- category
- MRP
- selling price
- cost price
- reorder level
- product type

### Warehouses

A warehouse is a branch marked as `is_warehouse`.

Warehouse branches have an inventory location where stock is stored.

Typical flow:

```text
Purchase stock into warehouse
Transfer stock from warehouse to salon branch
Salon sells product in billing
```

### Stock Levels

Stock levels are location-specific.

Example:

```text
Product: Hair Serum
Warehouse: On Hand 50, Reserved 0, Available 50
Salon A: On Hand 8, Reserved 2, Available 6
Salon B: On Hand 0, Reserved 0, Available 0
```

Low-stock alerts are also location-specific.

### Stock Transfers

Stock transfers move stock from one inventory location to another.

Current flow:

```text
Create transfer
Approve transfer
Source location decreases
Destination location increases
transfer_out and transfer_in transactions are written
```

Transfers do not create cash income or expense records.

### Suppliers

Suppliers are vendors from whom stock is purchased.

Suppliers are used in purchase batches and supplier payment tracking.

### Purchase Batches

Purchase batches record stock purchases.

Typical flow:

```text
Select supplier
Select branch or warehouse
Add products, quantity, and unit cost
Record optional payment
Enable auto-add inventory if stock should be received immediately
```

If auto-add inventory is enabled:

- inventory quantity increases
- `purchase` transaction is written

### Print Barcodes

Barcode printing is used after product creation.

Typical flow:

```text
Create product
Product gets barcode
Open Print Barcodes
Select products
Print labels
Use scanner during billing or lookup
```

## Current Safe Workflow

### Receiving stock

Use `Purchase Batches`.

If the stock has physically arrived, enable auto-add inventory.

### Moving stock

Use `Stock Transfers`.

Create a transfer, then approve it.

### Selling stock

Use billing.

Pending bills reserve stock.

Completed bills consume stock and create sale audit entries.

### Correcting stock

Use `Inventory > Adjust Stock`.

Always enter a clear reason, for example:

- opening stock
- physical count correction
- damaged product
- stock found
- manual correction

## Important Rules

- Do not manually edit database stock quantities.
- Use Inventory adjustment for corrections.
- Use Purchase Batches for supplier purchases.
- Use Stock Transfers for location movement.
- Use `Available` quantity for sale/transfer decisions.
- A pending bill reserves stock.
- A completed bill consumes stock.
- Internal stock transfer is not a sale.

## Known Limitations / Next Important Work

These are not fully implemented yet and should be considered Phase B.

### Moving average cost

Current sale transactions use product `cost_price`.

Recommended next step:

- add `moving_average_cost`
- recalculate after purchases
- use it for sale transaction cost and COGS

### Batch-level inventory

Current inventory has batch fields on the inventory row, but there is no separate `inventory_batches` table.

Recommended next step:

- create `inventory_batches`
- track quantity and reserved quantity per batch
- implement FEFO picking for expiring products

### Location-specific reorder levels

Current reorder level is on Product.

Recommended next step:

- add `location_product_config`
- store reorder level per product per location

### Wastage and returns UI

Manual adjustments can be used today, but dedicated flows would be better.

Recommended next step:

- Wastage form
- Customer return form
- transaction types: `wastage`, `return_item`

### Transaction reconciliation report

Recommended next step:

- report current inventory quantity versus sum of inventory transactions
- detect drift early

## Files Changed

Backend:

- `salon-erp-be/src/services/bill.service.js`
- `salon-erp-be/src/services/inventory.service.js`
- `salon-erp-be/src/services/product.service.js`
- `salon-erp-be/src/services/purchaseBatch.service.js`
- `salon-erp-be/src/services/reports.service.js`
- `salon-erp-be/src/server.js`
- `salon-erp-be/docker-compose.yml`
- `salon-erp-be/scripts/repair-local-schema-drift.sh`

Frontend:

- `src/pages/InventoryPage.jsx`
- `src/pages/StockTransfersPage.jsx`

## Verification Done

- Backend service syntax checks passed with `node -c`.
- Frontend production build passed with `npm run build`.
- Build still shows existing large chunk warnings.
