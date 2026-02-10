const prisma = require('../config/database');
const AppError = require('../utils/AppError');

class BillService {
  async createBill(data, createdById) {
    const { customer_id, branch_id, items, payments, notes, discount_amount = 0, discount_reason, bill_type = 'current', bill_date } = data;

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customer_id },
    });
    if (!customer) {
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branch_id },
    });
    if (!branch) {
      throw new AppError('Branch not found', 404, 'NOT_FOUND');
    }

    // Calculate totals
    let subtotal = 0;
    let itemsDiscount = 0;

    for (const item of items) {
      const itemTotal = item.unit_price * item.quantity;
      subtotal += itemTotal;
      itemsDiscount += item.discount_amount || 0;
    }

    // Total discount = item discounts + bill-level discount
    const totalDiscount = itemsDiscount + discount_amount;
    const totalAmount = subtotal - totalDiscount;

    // Verify payments match total
    const paymentTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(paymentTotal - totalAmount) > 0.01) {
      throw new AppError(
        `Payment amount (${paymentTotal}) does not match total (${totalAmount})`,
        422,
        'PAYMENT_MISMATCH'
      );
    }

    // Generate bill number
    const billNumber = await this.generateBillNumber(branch.code);

    // Create bill with items and payments in transaction
    const bill = await prisma.$transaction(async (tx) => {
      // Create bill
      const newBill = await tx.bill.create({
        data: {
          billNumber,
          customerId: customer_id,
          branchId: branch_id,
          billDate: bill_date ? new Date(bill_date) : new Date(),
          subtotal,
          discountAmount: totalDiscount,
          totalAmount,
          status: 'completed',
          notes,
          createdById,
          billItems: {
            create: items.map((item) => {
              // Support multiple employees for any item: use employee_ids[0] when employee_id not set
              const firstEmployeeId = item.employee_id ?? (Array.isArray(item.employee_ids) && item.employee_ids.length > 0 ? item.employee_ids[0] : null);
              const itemStatus = item.status && ['pending', 'in_progress', 'completed', 'rejected'].includes(item.status) ? item.status : 'completed';
              return {
                itemType: item.item_type,
                serviceId: item.service_id,
                packageId: item.package_id,
                productId: item.product_id,
                employeeId: firstEmployeeId,
                chairId: item.chair_id,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                discountAmount: item.discount_amount || 0,
                discountPercent: item.discount_percentage || 0,
                totalPrice: item.unit_price * item.quantity - (item.discount_amount || 0),
                status: itemStatus,
                notes: item.notes,
              };
            }),
          },
          payments: {
            create: payments.map((payment) => ({
              paymentMode: payment.payment_mode,
              amount: payment.amount,
              transactionReference: payment.transaction_reference,
              bankName: payment.bank_name,
              notes: payment.notes,
              createdById,
            })),
          },
        },
        include: {
          customer: true,
          branch: true,
          billItems: {
            include: {
              service: true,
              package: true,
              product: true,
              employee: { select: { id: true, fullName: true } },
              employees: {
                include: {
                  employee: { select: { id: true, fullName: true } },
                },
              },
            },
          },
          payments: true,
          createdBy: { select: { id: true, fullName: true } },
        },
      });

      // Save multiple employee assignments for any item (not limited to multi-employee services)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const ids = (Array.isArray(item.employee_ids) ? item.employee_ids : [])
          .filter((id) => id && typeof id === 'string' && uuidRegex.test(id));
        if (ids.length > 0) {
          await tx.billItemEmployee.createMany({
            data: ids.map((empId) => ({
              billItemId: newBill.billItems[i].id,
              employeeId: empId,
            })),
          });
        }
      }

      // Update customer statistics
      await tx.customer.update({
        where: { id: customer_id },
        data: {
          totalVisits: { increment: 1 },
          totalSpent: { increment: totalAmount },
          lastVisitDate: new Date(),
        },
      });

      // Update inventory for product items
      for (const item of items) {
        if (item.item_type === 'product' && item.product_id) {
          // Find inventory location for branch
          const inventoryLocation = await tx.inventoryLocation.findFirst({
            where: { branchId: branch_id, isActive: true },
          });

          if (inventoryLocation) {
            await tx.inventory.updateMany({
              where: {
                productId: item.product_id,
                locationId: inventoryLocation.id,
              },
              data: {
                quantity: { decrement: item.quantity },
              },
            });
          }
        }
      }

      return newBill;
    });

    return this.formatBill(bill);
  }

  async generateBillNumber(branchCode) {
    const today = new Date();
    const year = today.getFullYear();
    const prefix = `${branchCode}-${year}`;

    // Get the latest bill number for this prefix
    const latestBill = await prisma.bill.findFirst({
      where: {
        billNumber: { startsWith: prefix },
      },
      orderBy: { billNumber: 'desc' },
    });

    let sequence = 1;
    if (latestBill) {
      const parts = latestBill.billNumber.split('-');
      const lastSequence = parseInt(parts[parts.length - 1]) || 0;
      sequence = lastSequence + 1;
    }

    return `${prefix}-${sequence.toString().padStart(6, '0')}`;
  }

  async getBills(filters) {
    const {
      page = 1,
      limit = 20,
      branch_id,
      customer_id,
      status,
      start_date,
      end_date,
      search,
      sort_by = 'billDate',
      sort_order = 'desc',
      userRole,
      userBranchId,
    } = filters;

    const where = {};

    // Role-based filtering
    if (userRole !== 'owner' && userRole !== 'developer') {
      where.branchId = userBranchId;
    } else if (branch_id) {
      where.branchId = branch_id;
    }

    if (customer_id) where.customerId = customer_id;
    if (status) where.status = status;

    if (start_date || end_date) {
      where.billDate = {};
      if (start_date) where.billDate.gte = new Date(start_date);
      if (end_date) {
        const endOfDay = new Date(end_date);
        endOfDay.setHours(23, 59, 59, 999);
        where.billDate.lte = endOfDay;
      }
    }

    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: 'insensitive' } },
        { customer: { customerName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const orderBy = {};
    orderBy[sort_by === 'bill_date' ? 'billDate' : sort_by] = sort_order;

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          customer: { select: { id: true, customerName: true, phoneMasked: true } },
          branch: { select: { id: true, name: true } },
          _count: { select: { billItems: true } },
        },
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.bill.count({ where }),
    ]);

    return {
      bills: bills.map((bill) => ({
        bill_id: bill.id,
        bill_number: bill.billNumber,
        customer: {
          customer_id: bill.customer.id,
          customer_name: bill.customer.customerName,
          phone_masked: bill.customer.phoneMasked,
        },
        branch: {
          branch_id: bill.branch.id,
          branch_name: bill.branch.name,
        },
        bill_date: bill.billDate,
        total_amount: parseFloat(bill.totalAmount),
        status: bill.status,
        items_count: bill._count.billItems,
      })),
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

  async getBillById(id, { userRole, userBranchId } = {}) {
    const bill = await prisma.bill.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        billItems: {
          include: {
            service: true,
            package: true,
            product: true,
            employee: { select: { id: true, fullName: true } },
            employees: {
              include: {
                employee: { select: { id: true, fullName: true } },
              },
            },
            chair: { select: { id: true, chairNumber: true, chairName: true } },
          },
        },
        payments: true,
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    if (!bill) {
      throw new AppError('Bill not found', 404, 'NOT_FOUND');
    }

    // Check access based on role
    if (userRole && userRole !== 'owner' && userRole !== 'developer') {
      if (bill.branchId !== userBranchId) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    return this.formatBill(bill);
  }

  async updateBill(id, data, { userRole, userBranchId } = {}) {
    const bill = await prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      throw new AppError('Bill not found', 404, 'NOT_FOUND');
    }

    // Check access
    if (userRole && userRole !== 'owner' && userRole !== 'developer') {
      if (bill.branchId !== userBranchId) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    // Only allow status update if current status is pending
    if (data.status && bill.status !== 'pending' && bill.status !== 'draft') {
      throw new AppError(
        'Cannot update status of completed or cancelled bill',
        422,
        'BUSINESS_RULE_VIOLATION'
      );
    }

    const updateData = {};
    if (data.status) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      for (const { item_id, status } of data.items) {
        await prisma.billItem.updateMany({
          where: { id: item_id, billId: id },
          data: { status },
        });
      }
    }

    const updatedBill = await prisma.bill.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        billItems: {
          include: {
            service: true,
            package: true,
            product: true,
            employee: { select: { id: true, fullName: true } },
            employees: {
              include: {
                employee: { select: { id: true, fullName: true } },
              },
            },
          },
        },
        payments: true,
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    return this.formatBill(updatedBill);
  }

  async cancelBill(id, { userRole, userBranchId } = {}) {
    const bill = await prisma.bill.findUnique({
      where: { id },
    });

    if (!bill) {
      throw new AppError('Bill not found', 404, 'NOT_FOUND');
    }

    // Check access
    if (userRole && userRole !== 'owner' && userRole !== 'developer') {
      if (bill.branchId !== userBranchId) {
        throw new AppError('Access denied', 403, 'FORBIDDEN');
      }
    }

    await prisma.bill.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  formatBill(bill) {
    return {
      bill_id: bill.id,
      bill_number: bill.billNumber,
      customer: {
        customer_id: bill.customer.id,
        customer_name: bill.customer.customerName,
        phone: bill.customer.phone,
        phone_masked: bill.customer.phoneMasked,
        email: bill.customer.email,
      },
      branch: {
        branch_id: bill.branch.id,
        branch_name: bill.branch.name,
        branch_code: bill.branch.code,
      },
      bill_date: bill.billDate,
      items: bill.billItems.map((item) => {
        const serviceName = item.service?.serviceName ?? (item.serviceId && (item.notes || 'Unknown Service'));
        const packageName = item.package?.packageName ?? (item.packageId && (item.notes || 'Unknown Package'));
        const productName = item.product?.productName ?? (item.productId && (item.notes || 'Unknown Product'));
        const item_name =
          (item.itemType === 'service' && serviceName) ||
          (item.itemType === 'package' && packageName) ||
          (item.itemType === 'product' && productName) ||
          serviceName ||
          packageName ||
          productName ||
          item.notes ||
          'Unknown Item';
        return {
          item_id: item.id,
          item_type: item.itemType,
          item_name,
          service:
            item.service
              ? { service_id: item.service.id, service_name: item.service.serviceName }
              : item.serviceId
                ? { service_id: item.serviceId, service_name: item.notes || 'Unknown Service' }
                : null,
          package: item.package
            ? { package_id: item.package.id, package_name: item.package.packageName }
            : item.packageId
              ? { package_id: item.packageId, package_name: item.notes || 'Unknown Package' }
              : null,
          product: item.product
            ? { product_id: item.product.id, product_name: item.product.productName }
            : item.productId
              ? { product_id: item.productId, product_name: item.notes || 'Unknown Product' }
              : null,
          employee: item.employee
            ? { employee_id: item.employee.id, full_name: item.employee.fullName }
            : null,
          employees: (item.employees || []).map(e => ({
            employee_id: e.employee.id,
            full_name: e.employee.fullName,
          })),
          chair: item.chair
            ? { chair_id: item.chair.id, chair_number: item.chair.chairNumber }
            : null,
          quantity: item.quantity,
          unit_price: parseFloat(item.unitPrice),
          discount_amount: parseFloat(item.discountAmount),
          total_price: parseFloat(item.totalPrice),
          status: item.status,
          notes: item.notes,
        };
      }),
      subtotal: parseFloat(bill.subtotal),
      discount_amount: parseFloat(bill.discountAmount),
      tax_amount: parseFloat(bill.taxAmount),
      total_amount: parseFloat(bill.totalAmount),
      payments: bill.payments.map((p) => ({
        payment_id: p.id,
        payment_mode: p.paymentMode,
        amount: parseFloat(p.amount),
        transaction_reference: p.transactionReference,
        bank_name: p.bankName,
        transaction_date: p.transactionDate,
      })),
      status: bill.status,
      notes: bill.notes,
      is_imported: bill.isImported,
      created_by: bill.createdBy
        ? { user_id: bill.createdBy.id, full_name: bill.createdBy.fullName }
        : null,
      created_at: bill.createdAt,
      updated_at: bill.updatedAt,
    };
  }
}

module.exports = new BillService();
