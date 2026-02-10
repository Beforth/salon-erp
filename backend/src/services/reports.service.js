const prisma = require('../config/database');

class ReportsService {
  // Daily Sales Summary
  async getDailySales({ date, branch_id, userRole, userBranchId }) {
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    const where = {
      billDate: { gte: startOfDay, lte: endOfDay },
      status: 'completed',
    };

    // Role-based filtering
    if (userRole !== 'owner' && userRole !== 'developer') {
      where.branchId = userBranchId;
    } else if (branch_id) {
      where.branchId = branch_id;
    }

    const [bills, billsByPaymentMode, topServices] = await Promise.all([
      // Summary stats
      prisma.bill.aggregate({
        where,
        _sum: { totalAmount: true, discountAmount: true },
        _count: { id: true },
        _avg: { totalAmount: true },
      }),
      // By payment mode
      prisma.payment.groupBy({
        by: ['paymentMode'],
        where: {
          bill: where,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Top services
      prisma.billItem.groupBy({
        by: ['serviceId'],
        where: {
          bill: where,
          itemType: 'service',
          serviceId: { not: null },
        },
        _sum: { totalPrice: true },
        _count: { id: true },
      }),
    ]);

    // Get service names for top services
    const serviceIds = topServices.map((s) => s.serviceId).filter(Boolean);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, serviceName: true },
    });
    const serviceMap = new Map(services.map((s) => [s.id, s.serviceName]));

    return {
      date: startOfDay.toISOString().split('T')[0],
      summary: {
        total_bills: bills._count.id,
        total_revenue: parseFloat(bills._sum.totalAmount || 0),
        total_discount: parseFloat(bills._sum.discountAmount || 0),
        average_bill: parseFloat(bills._avg.totalAmount || 0),
      },
      by_payment_mode: billsByPaymentMode.map((p) => ({
        payment_mode: p.paymentMode,
        amount: parseFloat(p._sum.amount || 0),
        count: p._count,
      })),
      top_services: topServices
        .map((s) => ({
          service_name: serviceMap.get(s.serviceId) || 'Unknown',
          revenue: parseFloat(s._sum.totalPrice || 0),
          count: s._count,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
    };
  }

  // Monthly Revenue Report
  async getMonthlyRevenue({ year, month, branch_id, userRole, userBranchId }) {
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const where = {
      billDate: { gte: startDate, lte: endDate },
      status: 'completed',
    };

    if (userRole !== 'owner' && userRole !== 'developer') {
      where.branchId = userBranchId;
    } else if (branch_id) {
      where.branchId = branch_id;
    }

    // Get daily breakdown
    const bills = await prisma.bill.findMany({
      where,
      select: {
        billDate: true,
        totalAmount: true,
        discountAmount: true,
      },
    });

    // Group by day
    const dailyRevenue = {};
    bills.forEach((bill) => {
      const day = bill.billDate.toISOString().split('T')[0];
      if (!dailyRevenue[day]) {
        dailyRevenue[day] = { revenue: 0, discount: 0, count: 0 };
      }
      dailyRevenue[day].revenue += parseFloat(bill.totalAmount);
      dailyRevenue[day].discount += parseFloat(bill.discountAmount);
      dailyRevenue[day].count += 1;
    });

    // Get branch breakdown if owner
    let branchBreakdown = [];
    if (userRole === 'owner' || userRole === 'developer') {
      const branchStats = await prisma.bill.groupBy({
        by: ['branchId'],
        where: { ...where, branchId: undefined },
        _sum: { totalAmount: true },
        _count: { id: true },
      });

      const branches = await prisma.branch.findMany({
        where: { id: { in: branchStats.map((b) => b.branchId) } },
        select: { id: true, name: true },
      });
      const branchMap = new Map(branches.map((b) => [b.id, b.name]));

      branchBreakdown = branchStats.map((b) => ({
        branch_id: b.branchId,
        branch_name: branchMap.get(b.branchId) || 'Unknown',
        revenue: parseFloat(b._sum.totalAmount || 0),
        bills_count: b._count,
      }));
    }

    const totalRevenue = bills.reduce((sum, b) => sum + parseFloat(b.totalAmount), 0);
    const totalDiscount = bills.reduce((sum, b) => sum + parseFloat(b.discountAmount), 0);

    return {
      year: targetYear,
      month: targetMonth,
      summary: {
        total_revenue: totalRevenue,
        total_discount: totalDiscount,
        total_bills: bills.length,
        average_daily_revenue: totalRevenue / Object.keys(dailyRevenue).length || 0,
      },
      daily_breakdown: Object.entries(dailyRevenue)
        .map(([date, data]) => ({
          date,
          ...data,
        }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      branch_breakdown: branchBreakdown,
    };
  }

  // Customer Analytics
  async getCustomerAnalytics({ period = 30, branch_id, userRole, userBranchId }) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const billWhere = {
      billDate: { gte: startDate },
      status: 'completed',
    };

    if (userRole !== 'owner' && userRole !== 'developer') {
      billWhere.branchId = userBranchId;
    } else if (branch_id) {
      billWhere.branchId = branch_id;
    }

    // Top customers
    const topCustomers = await prisma.bill.groupBy({
      by: ['customerId'],
      where: billWhere,
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    const customerIds = topCustomers.map((c) => c.customerId);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, customerName: true, phoneMasked: true, totalVisits: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    // New vs returning customers
    const newCustomersCount = await prisma.customer.count({
      where: {
        createdAt: { gte: startDate },
      },
    });

    // Gender distribution
    const genderStats = await prisma.customer.groupBy({
      by: ['gender'],
      _count: { id: true },
    });

    // Age category distribution
    const ageStats = await prisma.customer.groupBy({
      by: ['ageCategory'],
      _count: { id: true },
    });

    return {
      period_days: period,
      top_customers: topCustomers
        .map((c) => {
          const customer = customerMap.get(c.customerId);
          return {
            customer_id: c.customerId,
            customer_name: customer?.customerName || 'Unknown',
            phone_masked: customer?.phoneMasked,
            total_spent: parseFloat(c._sum.totalAmount || 0),
            visits_in_period: c._count,
            total_visits: customer?.totalVisits || 0,
          };
        })
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 20),
      new_customers: newCustomersCount,
      demographics: {
        by_gender: genderStats.map((g) => ({
          gender: g.gender || 'unknown',
          count: g._count,
        })),
        by_age: ageStats.map((a) => ({
          age_category: a.ageCategory || 'unknown',
          count: a._count,
        })),
      },
    };
  }

  // Employee Performance (supports period in days or start_date + end_date for calendar range)
  async getEmployeePerformance({ period = 30, start_date, end_date, branch_id, employee_id, userRole, userBranchId }) {
    let rangeStart;
    let rangeEnd;
    if (start_date && end_date) {
      rangeStart = new Date(start_date);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(end_date);
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      rangeEnd = new Date();
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - period);
    }

    const itemWhere = {
      bill: {
        billDate: { gte: rangeStart, lte: rangeEnd },
        status: 'completed',
      },
      employeeId: { not: null },
    };

    if (userRole !== 'owner' && userRole !== 'developer') {
      itemWhere.bill.branchId = userBranchId;
    } else if (branch_id) {
      itemWhere.bill.branchId = branch_id;
    }

    if (employee_id) {
      itemWhere.employeeId = employee_id;
    }

    // Get performance stats by employee
    const employeeStats = await prisma.billItem.groupBy({
      by: ['employeeId'],
      where: itemWhere,
      _sum: { totalPrice: true },
      _count: { id: true },
    });

    // Get employee details
    const employeeIds = employeeStats.map((e) => e.employeeId).filter(Boolean);
    const employees = await prisma.user.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, fullName: true, branchId: true },
    });
    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // Get star points earned
    const starPoints = await prisma.billItem.groupBy({
      by: ['employeeId'],
      where: {
        ...itemWhere,
        service: { isNot: null },
      },
      _sum: { quantity: true },
    });

    // Get services with star points
    const servicesWithStars = await prisma.billItem.findMany({
      where: {
        ...itemWhere,
        service: { isNot: null },
      },
      include: {
        service: { select: { starPoints: true } },
      },
    });

    // Calculate star points per employee
    const starsByEmployee = {};
    servicesWithStars.forEach((item) => {
      if (item.employeeId && item.service) {
        if (!starsByEmployee[item.employeeId]) {
          starsByEmployee[item.employeeId] = 0;
        }
        starsByEmployee[item.employeeId] += (item.service.starPoints || 0) * item.quantity;
      }
    });

    return {
      period_days: period,
      employees: employeeStats
        .map((e) => {
          const employee = employeeMap.get(e.employeeId);
          return {
            employee_id: e.employeeId,
            employee_name: employee?.fullName || 'Unknown',
            services_completed: e._count,
            revenue_generated: parseFloat(e._sum.totalPrice || 0),
            star_points: starsByEmployee[e.employeeId] || 0,
          };
        })
        .sort((a, b) => b.revenue_generated - a.revenue_generated),
    };
  }

  // Service Analytics
  async getServiceAnalytics({ period = 30, branch_id, userRole, userBranchId }) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const itemWhere = {
      bill: {
        billDate: { gte: startDate },
        status: 'completed',
      },
      itemType: 'service',
      serviceId: { not: null },
    };

    if (userRole !== 'owner' && userRole !== 'developer') {
      itemWhere.bill.branchId = userBranchId;
    } else if (branch_id) {
      itemWhere.bill.branchId = branch_id;
    }

    // Service stats
    const serviceStats = await prisma.billItem.groupBy({
      by: ['serviceId'],
      where: itemWhere,
      _sum: { totalPrice: true, quantity: true },
      _count: { id: true },
    });

    // Get service details
    const serviceIds = serviceStats.map((s) => s.serviceId).filter(Boolean);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      include: { category: true },
    });
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    // Category breakdown
    const categoryRevenue = {};
    serviceStats.forEach((stat) => {
      const service = serviceMap.get(stat.serviceId);
      if (service) {
        const categoryName = service.category?.name || 'Other';
        if (!categoryRevenue[categoryName]) {
          categoryRevenue[categoryName] = { revenue: 0, count: 0 };
        }
        categoryRevenue[categoryName].revenue += parseFloat(stat._sum.totalPrice || 0);
        categoryRevenue[categoryName].count += stat._count;
      }
    });

    return {
      period_days: period,
      top_services: serviceStats
        .map((s) => {
          const service = serviceMap.get(s.serviceId);
          return {
            service_id: s.serviceId,
            service_name: service?.serviceName || 'Unknown',
            category: service?.category?.name || 'Other',
            quantity_sold: s._sum.quantity || 0,
            revenue: parseFloat(s._sum.totalPrice || 0),
            times_ordered: s._count,
          };
        })
        .sort((a, b) => b.revenue - a.revenue),
      by_category: Object.entries(categoryRevenue)
        .map(([category, data]) => ({
          category,
          ...data,
        }))
        .sort((a, b) => b.revenue - a.revenue),
    };
  }

  // Inventory Report
  async getInventoryReport({ location_id }) {
    const where = {};
    if (location_id) {
      where.locationId = location_id;
    }

    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        product: {
          include: { category: true },
        },
        location: true,
      },
    });

    // Calculate totals
    let totalValue = 0;
    let lowStockCount = 0;
    let expiringCount = 0;
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const items = inventory.map((inv) => {
      const value = inv.quantity * parseFloat(inv.product.costPrice || 0);
      totalValue += value;

      const isLowStock = inv.quantity <= inv.product.reorderLevel;
      if (isLowStock) lowStockCount++;

      const isExpiring = inv.expiryDate && new Date(inv.expiryDate) <= thirtyDaysFromNow;
      if (isExpiring) expiringCount++;

      return {
        product_id: inv.product.id,
        product_name: inv.product.productName,
        category: inv.product.category?.name || 'Other',
        location: inv.location.locationName,
        quantity: inv.quantity,
        reorder_level: inv.product.reorderLevel,
        is_low_stock: isLowStock,
        cost_price: parseFloat(inv.product.costPrice || 0),
        stock_value: value,
        expiry_date: inv.expiryDate,
        is_expiring_soon: isExpiring,
      };
    });

    // Group by category
    const byCategory = {};
    items.forEach((item) => {
      if (!byCategory[item.category]) {
        byCategory[item.category] = { value: 0, items: 0 };
      }
      byCategory[item.category].value += item.stock_value;
      byCategory[item.category].items += 1;
    });

    return {
      summary: {
        total_items: items.length,
        total_value: totalValue,
        low_stock_count: lowStockCount,
        expiring_soon_count: expiringCount,
      },
      by_category: Object.entries(byCategory)
        .map(([category, data]) => ({
          category,
          ...data,
        }))
        .sort((a, b) => b.value - a.value),
      items: items.sort((a, b) => b.stock_value - a.stock_value),
      low_stock_items: items.filter((i) => i.is_low_stock),
      expiring_items: items.filter((i) => i.is_expiring_soon),
    };
  }

  // Dashboard Stats (for quick overview)
  async getDashboardStats({ branch_id, userRole, userBranchId }) {
    const now = new Date();
    const today = new Date(now);
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const where = { status: 'completed' };
    const branchFilter = {};
    if (userRole !== 'owner' && userRole !== 'developer') {
      where.branchId = userBranchId;
      branchFilter.branchId = userBranchId;
    } else if (branch_id) {
      where.branchId = branch_id;
      branchFilter.branchId = branch_id;
    }

    const [
      todayStats,
      monthStats,
      lastMonthStats,
      activeCustomersThisMonth,
      activeCustomersLastMonth,
      newCustomersToday,
      todayServicesCount,
      branchStats,
      branches,
      lastMonthBranchStats,
    ] = await Promise.all([
      // Today's stats
      prisma.bill.aggregate({
        where: { ...where, billDate: { gte: startOfToday, lte: endOfToday } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // This month stats
      prisma.bill.aggregate({
        where: { ...where, billDate: { gte: startOfMonth } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Last month stats
      prisma.bill.aggregate({
        where: { ...where, billDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      // Active customers this month (unique customers with bills)
      prisma.bill.groupBy({
        by: ['customerId'],
        where: { ...where, billDate: { gte: startOfMonth } },
      }),
      // Active customers last month
      prisma.bill.groupBy({
        by: ['customerId'],
        where: { ...where, billDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      // New customers today
      prisma.customer.count({
        where: { createdAt: { gte: startOfToday, lte: endOfToday } },
      }),
      // Services provided today
      prisma.billItem.count({
        where: {
          bill: { ...where, billDate: { gte: startOfToday, lte: endOfToday } },
          itemType: 'service',
        },
      }),
      // Branch performance this month (for owners)
      userRole === 'owner' || userRole === 'developer'
        ? prisma.bill.groupBy({
            by: ['branchId'],
            where: { status: 'completed', billDate: { gte: startOfMonth } },
            _sum: { totalAmount: true },
            _count: { id: true },
          })
        : [],
      // All branches
      prisma.branch.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
      }),
      // Last month branch stats for growth calculation
      userRole === 'owner' || userRole === 'developer'
        ? prisma.bill.groupBy({
            by: ['branchId'],
            where: { status: 'completed', billDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
            _sum: { totalAmount: true },
            _count: { id: true },
          })
        : [],
    ]);

    // Calculate metrics
    const monthRevenue = parseFloat(monthStats._sum.totalAmount || 0);
    const lastMonthRevenue = parseFloat(lastMonthStats._sum.totalAmount || 0);
    const revenueChange = lastMonthRevenue > 0
      ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

    const monthBills = monthStats._count.id || 0;
    const lastMonthBills = lastMonthStats._count.id || 0;
    const billsChange = lastMonthBills > 0
      ? ((monthBills - lastMonthBills) / lastMonthBills) * 100
      : 0;

    const activeCustomersCount = activeCustomersThisMonth.length;
    const lastMonthActiveCustomers = activeCustomersLastMonth.length;
    const customersChange = lastMonthActiveCustomers > 0
      ? ((activeCustomersCount - lastMonthActiveCustomers) / lastMonthActiveCustomers) * 100
      : 0;

    const avgBillValue = monthBills > 0 ? monthRevenue / monthBills : 0;
    const lastMonthAvgBill = lastMonthBills > 0 ? lastMonthRevenue / lastMonthBills : 0;
    const avgBillChange = lastMonthAvgBill > 0
      ? ((avgBillValue - lastMonthAvgBill) / lastMonthAvgBill) * 100
      : 0;

    // Branch performance with growth
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));
    const lastMonthBranchMap = new Map(
      lastMonthBranchStats.map((b) => [b.branchId, parseFloat(b._sum.totalAmount || 0)])
    );

    const branchPerformance = branchStats.map((b) => {
      const lastMonthRev = lastMonthBranchMap.get(b.branchId) || 0;
      const thisMonthRev = parseFloat(b._sum.totalAmount || 0);
      const growth = lastMonthRev > 0
        ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100
        : 0;

      return {
        id: b.branchId,
        name: branchMap.get(b.branchId) || 'Unknown Branch',
        revenue: thisMonthRev,
        billCount: b._count.id,
        growth: Math.round(growth * 10) / 10,
      };
    }).sort((a, b) => b.revenue - a.revenue);

    return {
      // Monthly stats
      monthlyRevenue: monthRevenue,
      revenueChange: Math.round(revenueChange * 10) / 10,
      monthlyBills: monthBills,
      billsChange: Math.round(billsChange * 10) / 10,
      activeCustomers: activeCustomersCount,
      customersChange: Math.round(customersChange * 10) / 10,
      averageBillValue: Math.round(avgBillValue),
      avgBillChange: Math.round(avgBillChange * 10) / 10,

      // Branch performance (for owner/developer)
      branchPerformance,

      // Today's summary
      todaySummary: {
        revenue: parseFloat(todayStats._sum.totalAmount || 0),
        billCount: todayStats._count.id || 0,
        newCustomers: newCustomersToday,
        servicesProvided: todayServicesCount,
      },
    };
  }
}

module.exports = new ReportsService();
