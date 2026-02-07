const prisma = require('../config/database');
const AppError = require('../utils/AppError');

class CustomerService {
  maskPhone(phone) {
    if (!phone || phone.length < 10) return null;
    return phone.substring(0, 2) + '****' + phone.substring(phone.length - 4);
  }

  async createCustomer(data, createdById) {
    const customerData = {
      customerName: data.customer_name,
      phone: data.phone,
      phoneMasked: this.maskPhone(data.phone),
      email: data.email,
      gender: data.gender,
      ageCategory: data.age_category,
      dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth) : null,
      address: data.address,
      city: data.city,
      pincode: data.pincode,
      notes: data.notes,
      createdById,
    };

    const customer = await prisma.customer.create({
      data: customerData,
    });

    return this.formatCustomer(customer);
  }

  async getCustomers(filters) {
    const {
      page = 1,
      limit = 20,
      search,
      gender,
      age_category,
      sort_by = 'createdAt',
      sort_order = 'desc',
    } = filters;

    const where = {};

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (gender) where.gender = gender;
    if (age_category) where.ageCategory = age_category;

    const orderBy = {};
    const sortField = this.mapSortField(sort_by);
    orderBy[sortField] = sort_order;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy,
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.customer.count({ where }),
    ]);

    return {
      customers: customers.map(this.formatCustomer),
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

  async getCustomerById(id) {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    return this.formatCustomer(customer, true);
  }

  async getCustomerHistory(id, filters) {
    const { page = 1, limit = 20, start_date, end_date } = filters;

    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    const billWhere = { customerId: id };

    if (start_date || end_date) {
      billWhere.billDate = {};
      if (start_date) billWhere.billDate.gte = new Date(start_date);
      if (end_date) billWhere.billDate.lte = new Date(end_date);
    }

    const [bills, total, statistics] = await Promise.all([
      prisma.bill.findMany({
        where: billWhere,
        include: {
          branch: { select: { id: true, name: true } },
          billItems: {
            include: {
              service: { select: { serviceName: true } },
              product: { select: { productName: true } },
            },
          },
        },
        orderBy: { billDate: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.bill.count({ where: billWhere }),
      this.getCustomerStatistics(id),
    ]);

    return {
      customer: this.formatCustomer(customer),
      statistics,
      bills: bills.map((bill) => ({
        bill_id: bill.id,
        bill_number: bill.billNumber,
        bill_date: bill.billDate,
        total_amount: parseFloat(bill.totalAmount),
        status: bill.status,
        branch: bill.branch,
        items_summary: bill.billItems
          .map((item) => item.service?.serviceName || item.product?.productName)
          .filter(Boolean)
          .join(', '),
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    };
  }

  async getCustomerStatistics(customerId) {
    const bills = await prisma.bill.findMany({
      where: { customerId, status: 'completed' },
      include: {
        billItems: {
          include: {
            service: { select: { serviceName: true } },
            employee: { select: { fullName: true } },
          },
        },
      },
    });

    const totalBills = bills.length;
    const totalSpent = bills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    const averageBill = totalBills > 0 ? totalSpent / totalBills : 0;
    const lastVisit = bills.length > 0
      ? Math.max(...bills.map(b => b.billDate.getTime()))
      : null;

    // Find favorite service
    const serviceCount = {};
    const employeeCount = {};

    bills.forEach((bill) => {
      bill.billItems.forEach((item) => {
        if (item.service?.serviceName) {
          serviceCount[item.service.serviceName] = (serviceCount[item.service.serviceName] || 0) + 1;
        }
        if (item.employee?.fullName) {
          employeeCount[item.employee.fullName] = (employeeCount[item.employee.fullName] || 0) + 1;
        }
      });
    });

    const favoriteService = Object.entries(serviceCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    const preferredEmployee = Object.entries(employeeCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    return {
      total_bills: totalBills,
      total_spent: totalSpent,
      average_bill: Math.round(averageBill * 100) / 100,
      last_visit: lastVisit ? new Date(lastVisit).toISOString() : null,
      favorite_service: favoriteService,
      preferred_employee: preferredEmployee,
    };
  }

  async updateCustomer(id, data) {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new AppError('Customer not found', 404, 'NOT_FOUND');
    }

    const updateData = {};

    if (data.customer_name !== undefined) updateData.customerName = data.customer_name;
    if (data.phone !== undefined) {
      updateData.phone = data.phone;
      updateData.phoneMasked = this.maskPhone(data.phone);
    }
    if (data.email !== undefined) updateData.email = data.email;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.age_category !== undefined) updateData.ageCategory = data.age_category;
    if (data.date_of_birth !== undefined) {
      updateData.dateOfBirth = data.date_of_birth ? new Date(data.date_of_birth) : null;
    }
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.pincode !== undefined) updateData.pincode = data.pincode;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    return this.formatCustomer(updatedCustomer);
  }

  async searchCustomers(query, limit = 10) {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { customerName: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query } },
        ],
      },
      take: parseInt(limit),
      orderBy: { lastVisitDate: 'desc' },
    });

    return customers.map((c) => ({
      customer_id: c.id,
      customer_name: c.customerName,
      phone_masked: c.phoneMasked,
      last_visit_date: c.lastVisitDate,
      total_visits: c.totalVisits,
    }));
  }

  formatCustomer(customer, includeFullPhone = false) {
    const formatted = {
      customer_id: customer.id,
      customer_name: customer.customerName,
      phone_masked: customer.phoneMasked,
      email: customer.email,
      gender: customer.gender,
      age_category: customer.ageCategory,
      total_visits: customer.totalVisits,
      total_spent: parseFloat(customer.totalSpent),
      last_visit_date: customer.lastVisitDate,
      created_at: customer.createdAt,
    };

    if (includeFullPhone) {
      formatted.phone = customer.phone;
      formatted.date_of_birth = customer.dateOfBirth;
      formatted.address = customer.address;
      formatted.city = customer.city;
      formatted.pincode = customer.pincode;
      formatted.notes = customer.notes;
    }

    return formatted;
  }

  mapSortField(field) {
    const mapping = {
      customer_name: 'customerName',
      last_visit_date: 'lastVisitDate',
      total_visits: 'totalVisits',
      total_spent: 'totalSpent',
      created_at: 'createdAt',
    };
    return mapping[field] || 'createdAt';
  }
}

module.exports = new CustomerService();
