const prisma = require('../config/database');
const AppError = require('../utils/AppError');
const csv = require('csv-parser');
const { Readable } = require('stream');

class ImportService {
  async importBills(data, userId, branchId) {
    const { records, field_mapping, create_missing_customers } = data;

    const results = {
      total: records.length,
      success: 0,
      failed: 0,
      errors: [],
    };

    // Get branch
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });
    if (!branch) {
      throw new AppError('Branch not found', 404, 'NOT_FOUND');
    }

    // Get all services for matching
    const services = await prisma.service.findMany({
      where: { isActive: true },
    });
    const serviceMap = new Map();
    services.forEach((s) => {
      serviceMap.set(s.serviceName.toLowerCase(), s);
    });

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNum = i + 1;

      try {
        // Extract fields based on mapping
        const customerName = record[field_mapping.customer_name];
        const customerPhone = record[field_mapping.customer_phone];
        const serviceName = record[field_mapping.service_name];
        const amount = parseFloat(record[field_mapping.amount]) || 0;
        const billDate = record[field_mapping.bill_date]
          ? new Date(record[field_mapping.bill_date])
          : new Date();
        const employeeName = record[field_mapping.employee_name];
        const paymentMode = record[field_mapping.payment_mode] || 'cash';
        const discount = parseFloat(record[field_mapping.discount]) || 0;

        // Validate required fields
        if (!customerName && !customerPhone) {
          throw new Error('Customer name or phone is required');
        }
        if (!serviceName) {
          throw new Error('Service name is required');
        }
        if (amount <= 0) {
          throw new Error('Amount must be greater than 0');
        }

        // Find or create customer
        let customer;
        if (customerPhone) {
          customer = await prisma.customer.findFirst({
            where: { phone: customerPhone },
          });
        }
        if (!customer && customerName) {
          customer = await prisma.customer.findFirst({
            where: { customerName: { equals: customerName, mode: 'insensitive' } },
          });
        }

        if (!customer) {
          if (create_missing_customers && customerName) {
            const phoneMasked = customerPhone
              ? customerPhone.substring(0, 2) + '****' + customerPhone.substring(6)
              : null;
            customer = await prisma.customer.create({
              data: {
                customerName,
                phone: customerPhone,
                phoneMasked,
                createdById: userId,
              },
            });
          } else {
            throw new Error(`Customer not found: ${customerName || customerPhone}`);
          }
        }

        // Find service
        const service = serviceMap.get(serviceName.toLowerCase());
        if (!service) {
          throw new Error(`Service not found: ${serviceName}`);
        }

        // Find employee if provided
        let employee = null;
        if (employeeName) {
          employee = await prisma.user.findFirst({
            where: {
              fullName: { contains: employeeName, mode: 'insensitive' },
              role: 'employee',
              branchId,
            },
          });
        }

        // Generate bill number
        const billNumber = await this.generateBillNumber(branch.code);

        // Create bill
        const totalAmount = amount - discount;

        await prisma.$transaction(async (tx) => {
          const bill = await tx.bill.create({
            data: {
              billNumber,
              customerId: customer.id,
              branchId,
              billDate,
              subtotal: amount,
              discountAmount: discount,
              totalAmount,
              status: 'completed',
              isImported: true,
              createdById: userId,
              billItems: {
                create: [
                  {
                    itemType: 'service',
                    serviceId: service.id,
                    employeeId: employee?.id,
                    quantity: 1,
                    unitPrice: amount,
                    discountAmount: discount,
                    totalPrice: totalAmount,
                    status: 'completed',
                  },
                ],
              },
              payments: {
                create: [
                  {
                    paymentMode: this.normalizePaymentMode(paymentMode),
                    amount: totalAmount,
                    createdById: userId,
                  },
                ],
              },
            },
          });

          // Update customer statistics
          await tx.customer.update({
            where: { id: customer.id },
            data: {
              totalVisits: { increment: 1 },
              totalSpent: { increment: totalAmount },
              lastVisitDate: billDate,
            },
          });
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          error: error.message,
          data: record,
        });
      }
    }

    return results;
  }

  async parseCSV(buffer) {
    return new Promise((resolve, reject) => {
      const results = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  async generateBillNumber(branchCode) {
    const today = new Date();
    const year = today.getFullYear();
    const prefix = `${branchCode}-${year}`;

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

  normalizePaymentMode(mode) {
    const normalized = mode?.toLowerCase().trim();
    const validModes = ['cash', 'card', 'upi', 'online', 'other'];
    if (validModes.includes(normalized)) {
      return normalized;
    }
    if (normalized?.includes('upi') || normalized?.includes('gpay') || normalized?.includes('phonepe')) {
      return 'upi';
    }
    if (normalized?.includes('card') || normalized?.includes('credit') || normalized?.includes('debit')) {
      return 'card';
    }
    return 'cash';
  }

  async validateImportData(records, fieldMapping) {
    const errors = [];
    const warnings = [];

    // Check required fields are mapped
    const requiredFields = ['customer_name', 'service_name', 'amount'];
    for (const field of requiredFields) {
      if (!fieldMapping[field]) {
        errors.push(`Required field '${field}' is not mapped`);
      }
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Validate each record
    for (let i = 0; i < Math.min(records.length, 10); i++) {
      const record = records[i];
      const rowNum = i + 1;

      if (!record[fieldMapping.customer_name] && !record[fieldMapping.customer_phone]) {
        warnings.push(`Row ${rowNum}: Missing customer identifier`);
      }
      if (!record[fieldMapping.service_name]) {
        warnings.push(`Row ${rowNum}: Missing service name`);
      }
      const amount = parseFloat(record[fieldMapping.amount]);
      if (isNaN(amount) || amount <= 0) {
        warnings.push(`Row ${rowNum}: Invalid amount`);
      }
    }

    return {
      valid: true,
      errors,
      warnings,
      preview: records.slice(0, 5),
    };
  }
}

module.exports = new ImportService();
