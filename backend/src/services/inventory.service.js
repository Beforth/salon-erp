const prisma = require('../config/database');
const AppError = require('../utils/AppError');

class InventoryService {
  async getInventory(filters) {
    const {
      page = 1,
      limit = 20,
      location_id,
      product_id,
      low_stock,
      expiring_soon,
    } = filters;

    const where = {};

    if (location_id) where.locationId = location_id;
    if (product_id) where.productId = product_id;

    const [inventory, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
            },
          },
          location: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.inventory.count({ where }),
    ]);

    let formattedInventory = inventory.map((inv) => ({
      inventory_id: inv.id,
      product: {
        product_id: inv.product.id,
        product_name: inv.product.productName,
        barcode: inv.product.barcode,
        sku: inv.product.sku,
        category: inv.product.category?.name,
        reorder_level: inv.product.reorderLevel,
      },
      location: {
        location_id: inv.location.id,
        location_name: inv.location.locationName,
        location_type: inv.location.locationType,
      },
      quantity: inv.quantity,
      reserved_quantity: inv.reservedQuantity,
      available_quantity: inv.quantity - inv.reservedQuantity,
      batch_number: inv.batchNumber,
      expiry_date: inv.expiryDate,
      is_low_stock: inv.quantity <= inv.product.reorderLevel,
      is_expiring_soon: inv.expiryDate
        ? new Date(inv.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        : false,
      last_restocked_at: inv.lastRestockedAt,
      updated_at: inv.updatedAt,
    }));

    // Apply filters
    if (low_stock === 'true') {
      formattedInventory = formattedInventory.filter((i) => i.is_low_stock);
    }
    if (expiring_soon === 'true') {
      formattedInventory = formattedInventory.filter((i) => i.is_expiring_soon);
    }

    return {
      inventory: formattedInventory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1,
      },
    };
  }

  async adjustStock(data, userId) {
    const {
      product_id,
      location_id,
      quantity,
      adjustment_type, // 'add' or 'subtract' or 'set'
      reason,
      batch_number,
      expiry_date,
    } = data;

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: product_id },
    });
    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    // Verify location exists
    const location = await prisma.inventoryLocation.findUnique({
      where: { id: location_id },
    });
    if (!location) {
      throw new AppError('Location not found', 404, 'NOT_FOUND');
    }

    // Find or create inventory record
    let inventory = await prisma.inventory.findFirst({
      where: {
        productId: product_id,
        locationId: location_id,
        batchNumber: batch_number || null,
      },
    });

    let newQuantity;
    let transactionQuantity;
    let transactionType;

    if (adjustment_type === 'add') {
      newQuantity = (inventory?.quantity || 0) + quantity;
      transactionQuantity = quantity;
      transactionType = 'purchase';
    } else if (adjustment_type === 'subtract') {
      newQuantity = (inventory?.quantity || 0) - quantity;
      if (newQuantity < 0) {
        throw new AppError('Insufficient stock', 422, 'INSUFFICIENT_STOCK');
      }
      transactionQuantity = -quantity;
      transactionType = 'adjustment';
    } else if (adjustment_type === 'set') {
      transactionQuantity = quantity - (inventory?.quantity || 0);
      newQuantity = quantity;
      transactionType = 'adjustment';
    } else {
      throw new AppError('Invalid adjustment type', 422, 'INVALID_ADJUSTMENT_TYPE');
    }

    // Update or create inventory
    const result = await prisma.$transaction(async (tx) => {
      let updatedInventory;

      if (inventory) {
        updatedInventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: newQuantity,
            lastRestockedAt: adjustment_type === 'add' ? new Date() : undefined,
            expiryDate: expiry_date ? new Date(expiry_date) : undefined,
          },
        });
      } else {
        updatedInventory = await tx.inventory.create({
          data: {
            productId: product_id,
            locationId: location_id,
            quantity: newQuantity,
            batchNumber: batch_number,
            expiryDate: expiry_date ? new Date(expiry_date) : null,
            lastRestockedAt: new Date(),
          },
        });
      }

      // Create transaction record
      await tx.inventoryTransaction.create({
        data: {
          productId: product_id,
          toLocationId: adjustment_type === 'add' ? location_id : null,
          fromLocationId: adjustment_type === 'subtract' ? location_id : null,
          transactionType,
          quantity: Math.abs(transactionQuantity),
          notes: reason,
          createdById: userId,
        },
      });

      return updatedInventory;
    });

    return {
      inventory_id: result.id,
      product_id: result.productId,
      location_id: result.locationId,
      quantity: result.quantity,
      message: `Stock ${adjustment_type === 'add' ? 'added' : adjustment_type === 'subtract' ? 'subtracted' : 'set'} successfully`,
    };
  }

  async createStockTransfer(data, userId) {
    const {
      from_location_id,
      to_location_id,
      items, // [{ product_id, quantity }]
      notes,
    } = data;

    // Verify locations
    const [fromLocation, toLocation] = await Promise.all([
      prisma.inventoryLocation.findUnique({ where: { id: from_location_id } }),
      prisma.inventoryLocation.findUnique({ where: { id: to_location_id } }),
    ]);

    if (!fromLocation) {
      throw new AppError('Source location not found', 404, 'NOT_FOUND');
    }
    if (!toLocation) {
      throw new AppError('Destination location not found', 404, 'NOT_FOUND');
    }

    // Verify stock availability
    for (const item of items) {
      const inventory = await prisma.inventory.findFirst({
        where: {
          productId: item.product_id,
          locationId: from_location_id,
        },
      });

      if (!inventory || inventory.quantity < item.quantity) {
        const product = await prisma.product.findUnique({
          where: { id: item.product_id },
        });
        throw new AppError(
          `Insufficient stock for ${product?.productName || 'product'}`,
          422,
          'INSUFFICIENT_STOCK'
        );
      }
    }

    // Generate transfer number
    const transferNumber = await this.generateTransferNumber();

    // Create transfer
    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNumber,
        fromLocationId: from_location_id,
        toLocationId: to_location_id,
        status: 'pending',
        requestedById: userId,
        notes,
        items: {
          create: items.map((item) => ({
            productId: item.product_id,
            quantityRequested: item.quantity,
          })),
        },
      },
      include: {
        fromLocation: true,
        toLocation: true,
        items: {
          include: {
            product: true,
          },
        },
        requestedBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    return this.formatTransfer(transfer);
  }

  async approveStockTransfer(transferId, userId) {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });

    if (!transfer) {
      throw new AppError('Transfer not found', 404, 'NOT_FOUND');
    }

    if (transfer.status !== 'pending') {
      throw new AppError('Transfer is not pending approval', 422, 'INVALID_STATUS');
    }

    // Process the transfer
    await prisma.$transaction(async (tx) => {
      // Update transfer status
      await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: 'completed',
          approvedById: userId,
          approvedAt: new Date(),
          completedAt: new Date(),
          items: {
            updateMany: {
              where: { transferId },
              data: {
                quantitySent: { set: prisma.raw('quantity_requested') },
                quantityReceived: { set: prisma.raw('quantity_requested') },
              },
            },
          },
        },
      });

      // Process each item
      for (const item of transfer.items) {
        // Deduct from source
        await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            locationId: transfer.fromLocationId,
          },
          data: {
            quantity: { decrement: item.quantityRequested },
          },
        });

        // Add to destination
        const existingInventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            locationId: transfer.toLocationId,
          },
        });

        if (existingInventory) {
          await tx.inventory.update({
            where: { id: existingInventory.id },
            data: {
              quantity: { increment: item.quantityRequested },
              lastRestockedAt: new Date(),
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              productId: item.productId,
              locationId: transfer.toLocationId,
              quantity: item.quantityRequested,
              lastRestockedAt: new Date(),
            },
          });
        }

        // Create transaction records
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            fromLocationId: transfer.fromLocationId,
            transactionType: 'transfer_out',
            quantity: item.quantityRequested,
            referenceType: 'stock_transfer',
            referenceId: transferId,
            createdById: userId,
          },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            toLocationId: transfer.toLocationId,
            transactionType: 'transfer_in',
            quantity: item.quantityRequested,
            referenceType: 'stock_transfer',
            referenceId: transferId,
            createdById: userId,
          },
        });
      }
    });

    return { message: 'Transfer completed successfully' };
  }

  async getStockTransfers(filters) {
    const { page = 1, limit = 20, status, from_location_id, to_location_id } = filters;

    const where = {};
    if (status) where.status = status;
    if (from_location_id) where.fromLocationId = from_location_id;
    if (to_location_id) where.toLocationId = to_location_id;

    const [transfers, total] = await Promise.all([
      prisma.stockTransfer.findMany({
        where,
        include: {
          fromLocation: true,
          toLocation: true,
          items: {
            include: {
              product: true,
            },
          },
          requestedBy: { select: { id: true, fullName: true } },
          approvedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { requestedAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.stockTransfer.count({ where }),
    ]);

    return {
      transfers: transfers.map(this.formatTransfer),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) * parseInt(limit) < total,
        hasPrev: parseInt(page) > 1,
      },
    };
  }

  async getLocations() {
    const locations = await prisma.inventoryLocation.findMany({
      where: { isActive: true },
      include: {
        branch: {
          select: { id: true, name: true },
        },
      },
      orderBy: { locationName: 'asc' },
    });

    return locations.map((loc) => ({
      location_id: loc.id,
      location_name: loc.locationName,
      location_type: loc.locationType,
      branch: loc.branch
        ? { branch_id: loc.branch.id, branch_name: loc.branch.name }
        : null,
      address: loc.address,
    }));
  }

  async generateTransferNumber() {
    const today = new Date();
    const prefix = `TRF-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const latestTransfer = await prisma.stockTransfer.findFirst({
      where: {
        transferNumber: { startsWith: prefix },
      },
      orderBy: { transferNumber: 'desc' },
    });

    let sequence = 1;
    if (latestTransfer) {
      const lastSequence = parseInt(latestTransfer.transferNumber.split('-').pop()) || 0;
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(4, '0')}`;
  }

  formatTransfer(transfer) {
    return {
      transfer_id: transfer.id,
      transfer_number: transfer.transferNumber,
      from_location: {
        location_id: transfer.fromLocation.id,
        location_name: transfer.fromLocation.locationName,
      },
      to_location: {
        location_id: transfer.toLocation.id,
        location_name: transfer.toLocation.locationName,
      },
      status: transfer.status,
      items: transfer.items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.productName,
        quantity_requested: item.quantityRequested,
        quantity_sent: item.quantitySent,
        quantity_received: item.quantityReceived,
      })),
      requested_by: transfer.requestedBy
        ? { user_id: transfer.requestedBy.id, full_name: transfer.requestedBy.fullName }
        : null,
      approved_by: transfer.approvedBy
        ? { user_id: transfer.approvedBy.id, full_name: transfer.approvedBy.fullName }
        : null,
      requested_at: transfer.requestedAt,
      approved_at: transfer.approvedAt,
      completed_at: transfer.completedAt,
      notes: transfer.notes,
    };
  }
}

module.exports = new InventoryService();
