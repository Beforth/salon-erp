const prisma = require('../config/database');
const AppError = require('../utils/AppError');

class ProductService {
  async createProduct(data) {
    const {
      product_name,
      brand,
      category_id,
      barcode,
      sku,
      mrp,
      selling_price,
      cost_price,
      product_type,
      description,
      reorder_level,
    } = data;

    // Check for duplicate barcode
    if (barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode },
      });
      if (existingBarcode) {
        throw new AppError('Barcode already exists', 409, 'DUPLICATE_BARCODE');
      }
    }

    // Check for duplicate SKU
    if (sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku },
      });
      if (existingSku) {
        throw new AppError('SKU already exists', 409, 'DUPLICATE_SKU');
      }
    }

    const product = await prisma.product.create({
      data: {
        productName: product_name,
        brand,
        categoryId: category_id,
        barcode,
        sku,
        mrp,
        sellingPrice: selling_price,
        costPrice: cost_price,
        productType: product_type,
        description,
        reorderLevel: reorder_level || 0,
      },
      include: {
        category: true,
      },
    });

    return this.formatProduct(product);
  }

  async getProducts(filters) {
    const {
      page = 1,
      limit = 20,
      search,
      category_id,
      product_type,
      is_active,
      low_stock,
      sort_by = 'productName',
      sort_order = 'asc',
    } = filters;

    const where = {};

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category_id) where.categoryId = category_id;
    if (product_type) where.productType = product_type;
    if (is_active !== undefined) where.isActive = is_active === 'true';

    const orderBy = {};
    const sortField = sort_by === 'product_name' ? 'productName' : sort_by;
    orderBy[sortField] = sort_order;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          inventory: {
            include: {
              location: true,
            },
          },
        },
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    // Calculate total stock and check for low stock
    let formattedProducts = products.map((product) => {
      const totalStock = product.inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0
      );
      const isLowStock = totalStock <= product.reorderLevel;

      return {
        ...this.formatProduct(product),
        total_stock: totalStock,
        is_low_stock: isLowStock,
        stock_by_location: product.inventory.map((inv) => ({
          location_id: inv.location.id,
          location_name: inv.location.locationName,
          location_type: inv.location.locationType,
          quantity: inv.quantity,
        })),
      };
    });

    // Filter by low stock if requested
    if (low_stock === 'true') {
      formattedProducts = formattedProducts.filter((p) => p.is_low_stock);
    }

    return {
      products: formattedProducts,
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

  async getProductById(id) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventory: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    const totalStock = product.inventory.reduce(
      (sum, inv) => sum + inv.quantity,
      0
    );

    return {
      ...this.formatProduct(product),
      total_stock: totalStock,
      is_low_stock: totalStock <= product.reorderLevel,
      stock_by_location: product.inventory.map((inv) => ({
        location_id: inv.location.id,
        location_name: inv.location.locationName,
        location_type: inv.location.locationType,
        quantity: inv.quantity,
        expiry_date: inv.expiryDate,
        batch_number: inv.batchNumber,
      })),
    };
  }

  async updateProduct(id, data) {
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    // Check for duplicate barcode (excluding current product)
    if (data.barcode && data.barcode !== product.barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { barcode: data.barcode },
      });
      if (existingBarcode) {
        throw new AppError('Barcode already exists', 409, 'DUPLICATE_BARCODE');
      }
    }

    // Check for duplicate SKU (excluding current product)
    if (data.sku && data.sku !== product.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku) {
        throw new AppError('SKU already exists', 409, 'DUPLICATE_SKU');
      }
    }

    const updateData = {};
    if (data.product_name !== undefined) updateData.productName = data.product_name;
    if (data.brand !== undefined) updateData.brand = data.brand;
    if (data.category_id !== undefined) updateData.categoryId = data.category_id;
    if (data.barcode !== undefined) updateData.barcode = data.barcode;
    if (data.sku !== undefined) updateData.sku = data.sku;
    if (data.mrp !== undefined) updateData.mrp = data.mrp;
    if (data.selling_price !== undefined) updateData.sellingPrice = data.selling_price;
    if (data.cost_price !== undefined) updateData.costPrice = data.cost_price;
    if (data.product_type !== undefined) updateData.productType = data.product_type;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.reorder_level !== undefined) updateData.reorderLevel = data.reorder_level;
    if (data.is_active !== undefined) updateData.isActive = data.is_active;

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
      },
    });

    return this.formatProduct(updated);
  }

  async deleteProduct(id) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        billItems: { take: 1 },
        inventory: { take: 1 },
      },
    });

    if (!product) {
      throw new AppError('Product not found', 404, 'NOT_FOUND');
    }

    // Check if product has been used
    if (product.billItems.length > 0 || product.inventory.length > 0) {
      // Soft delete by deactivating
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });
      return { deactivated: true };
    }

    // Hard delete if never used
    await prisma.product.delete({
      where: { id },
    });
    return { deleted: true };
  }

  async getProductCategories() {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return categories.map((c) => ({
      category_id: c.id,
      name: c.name,
      description: c.description,
      parent_id: c.parentId,
    }));
  }

  async getLowStockProducts() {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        inventory: {
          include: {
            location: true,
          },
        },
      },
    });

    const lowStockProducts = products
      .map((product) => {
        const totalStock = product.inventory.reduce(
          (sum, inv) => sum + inv.quantity,
          0
        );
        return {
          ...this.formatProduct(product),
          total_stock: totalStock,
          reorder_level: product.reorderLevel,
          shortage: product.reorderLevel - totalStock,
        };
      })
      .filter((p) => p.total_stock <= p.reorder_level)
      .sort((a, b) => b.shortage - a.shortage);

    return lowStockProducts;
  }

  formatProduct(product) {
    return {
      product_id: product.id,
      product_name: product.productName,
      brand: product.brand,
      category: product.category
        ? {
            category_id: product.category.id,
            name: product.category.name,
          }
        : null,
      barcode: product.barcode,
      sku: product.sku,
      mrp: product.mrp ? parseFloat(product.mrp) : null,
      selling_price: product.sellingPrice ? parseFloat(product.sellingPrice) : null,
      cost_price: product.costPrice ? parseFloat(product.costPrice) : null,
      product_type: product.productType,
      description: product.description,
      reorder_level: product.reorderLevel,
      is_active: product.isActive,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    };
  }
}

module.exports = new ProductService();
