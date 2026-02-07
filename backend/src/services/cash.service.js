const prisma = require('../config/database');
const AppError = require('../utils/AppError');

class CashService {
  /**
   * Get cash summary for a specific date and branch
   */
  async getDailyCashSummary(date, branchId, userId) {
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    // Get all completed bills for the day
    const bills = await prisma.bill.findMany({
      where: {
        branchId: branchId,
        status: 'completed',
        billDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        payments: true,
      },
    });

    // Calculate totals by payment mode
    const paymentTotals = {
      cash: 0,
      card: 0,
      upi: 0,
      bank_transfer: 0,
      other: 0,
    };

    bills.forEach(bill => {
      bill.payments.forEach(payment => {
        const mode = payment.paymentMode.toLowerCase();
        if (paymentTotals.hasOwnProperty(mode)) {
          paymentTotals[mode] += parseFloat(payment.amount) || 0;
        } else {
          paymentTotals.other += parseFloat(payment.amount) || 0;
        }
      });
    });

    // Get any cash sources (additional cash in) for the day
    const cashSources = await prisma.cashSource.findMany({
      where: {
        branchId: branchId,
        transactionDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const totalCashIn = cashSources.reduce((sum, cs) => sum + (parseFloat(cs.amount) || 0), 0);

    // Get bank deposits (cash out) for the day
    const bankDeposits = await prisma.bankDeposit.findMany({
      where: {
        branchId: branchId,
        depositDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const totalBankDeposits = bankDeposits.reduce((sum, bd) => sum + (parseFloat(bd.amount) || 0), 0);

    // Get expenses for the day
    const expenses = await prisma.expense.findMany({
      where: {
        branchId: branchId,
        expenseDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        paymentMode: 'cash',
      },
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + (parseFloat(exp.amount) || 0), 0);

    // Calculate expected cash
    const expectedCash = paymentTotals.cash + totalCashIn - totalBankDeposits - totalExpenses;

    return {
      date: date,
      branch_id: branchId,
      bills_count: bills.length,
      total_revenue: Object.values(paymentTotals).reduce((a, b) => a + b, 0),
      payment_breakdown: {
        cash: paymentTotals.cash,
        card: paymentTotals.card,
        upi: paymentTotals.upi,
        bank_transfer: paymentTotals.bank_transfer,
        other: paymentTotals.other,
      },
      cash_sources: totalCashIn,
      bank_deposits: totalBankDeposits,
      cash_expenses: totalExpenses,
      expected_cash: expectedCash,
      cash_sources_detail: cashSources.map(cs => ({
        id: cs.id,
        type: cs.sourceType,
        amount: parseFloat(cs.amount),
        description: cs.description,
      })),
      bank_deposits_detail: bankDeposits.map(bd => ({
        id: bd.id,
        bank_name: bd.bankName,
        amount: parseFloat(bd.amount),
        reference: bd.referenceNumber,
      })),
      expenses_detail: expenses.map(exp => ({
        id: exp.id,
        category: exp.category,
        amount: parseFloat(exp.amount),
        description: exp.description,
      })),
    };
  }

  /**
   * Record cash count (reconciliation)
   */
  async recordCashCount(data, userId) {
    const {
      branch_id,
      date,
      actual_cash,
      denominations,
      notes,
    } = data;

    // Get expected cash
    const summary = await this.getDailyCashSummary(date, branch_id, userId);
    const expectedCash = summary.expected_cash;
    const difference = actual_cash - expectedCash;

    // Store in CashSource as a reconciliation record
    // Using 'counter' type for reconciliation tracking
    if (Math.abs(difference) > 0.01) {
      await prisma.cashSource.create({
        data: {
          sourceType: difference > 0 ? 'other' : 'counter',
          amount: Math.abs(difference),
          transactionDate: new Date(date),
          branchId: branch_id,
          description: `Cash reconciliation ${difference > 0 ? 'surplus' : 'shortage'}: ${notes || 'End of day count'}`,
          recordedById: userId,
        },
      });
    }

    return {
      date,
      branch_id,
      expected_cash: expectedCash,
      actual_cash: actual_cash,
      difference: difference,
      status: Math.abs(difference) < 1 ? 'balanced' : difference > 0 ? 'surplus' : 'shortage',
      denominations,
      notes,
      recorded_at: new Date(),
    };
  }

  /**
   * Add cash source (petty cash in)
   */
  async addCashSource(data, userId) {
    const {
      branch_id,
      source_type,
      amount,
      date,
      description,
    } = data;

    const cashSource = await prisma.cashSource.create({
      data: {
        sourceType: source_type,
        amount: parseFloat(amount),
        transactionDate: new Date(date),
        branchId: branch_id,
        description: description,
        recordedById: userId,
      },
    });

    return {
      id: cashSource.id,
      source_type: cashSource.sourceType,
      amount: parseFloat(cashSource.amount),
      date: cashSource.transactionDate,
      description: cashSource.description,
    };
  }

  /**
   * Record bank deposit
   */
  async recordBankDeposit(data, userId) {
    const {
      branch_id,
      bank_name,
      account_number,
      agent_name,
      agent_phone,
      amount,
      date,
      payment_source,
      reference_number,
      notes,
    } = data;

    const deposit = await prisma.bankDeposit.create({
      data: {
        branchId: branch_id,
        bankName: bank_name,
        accountNumber: account_number,
        agentName: agent_name,
        agentPhone: agent_phone,
        amount: parseFloat(amount),
        depositDate: new Date(date),
        paymentSource: payment_source || 'counter',
        referenceNumber: reference_number,
        notes: notes,
        createdById: userId,
      },
    });

    return {
      id: deposit.id,
      bank_name: deposit.bankName,
      amount: parseFloat(deposit.amount),
      date: deposit.depositDate,
      reference_number: deposit.referenceNumber,
    };
  }

  /**
   * Get cash history for a date range
   */
  async getCashHistory(branchId, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const [cashSources, bankDeposits] = await Promise.all([
      prisma.cashSource.findMany({
        where: {
          branchId,
          transactionDate: { gte: start, lte: end },
        },
        orderBy: { transactionDate: 'desc' },
        include: {
          recordedBy: {
            select: { fullName: true },
          },
        },
      }),
      prisma.bankDeposit.findMany({
        where: {
          branchId,
          depositDate: { gte: start, lte: end },
        },
        orderBy: { depositDate: 'desc' },
        include: {
          createdBy: {
            select: { fullName: true },
          },
        },
      }),
    ]);

    return {
      cash_sources: cashSources.map(cs => ({
        id: cs.id,
        type: 'cash_in',
        source_type: cs.sourceType,
        amount: parseFloat(cs.amount),
        date: cs.transactionDate,
        description: cs.description,
        recorded_by: cs.recordedBy?.fullName,
      })),
      bank_deposits: bankDeposits.map(bd => ({
        id: bd.id,
        type: 'deposit',
        bank_name: bd.bankName,
        amount: parseFloat(bd.amount),
        date: bd.depositDate,
        reference: bd.referenceNumber,
        recorded_by: bd.createdBy?.fullName,
      })),
    };
  }

  /**
   * Get denomination breakdown helper
   */
  calculateDenominations(denominations) {
    const rates = {
      '2000': 2000,
      '500': 500,
      '200': 200,
      '100': 100,
      '50': 50,
      '20': 20,
      '10': 10,
      '5': 5,
      '2': 2,
      '1': 1,
    };

    let total = 0;
    const breakdown = {};

    for (const [denom, count] of Object.entries(denominations || {})) {
      if (rates[denom] && count > 0) {
        breakdown[denom] = {
          count: count,
          value: rates[denom] * count,
        };
        total += rates[denom] * count;
      }
    }

    return { breakdown, total };
  }
}

module.exports = new CashService();
