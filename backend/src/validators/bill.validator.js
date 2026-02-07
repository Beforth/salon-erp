const { z } = require('zod');

const billItemTypeEnum = z.enum(['service', 'package', 'product']);
const paymentModeEnum = z.enum(['cash', 'card', 'upi', 'online', 'other']);
const billStatusEnum = z.enum(['draft', 'completed', 'pending', 'cancelled']);

const billItemSchema = z.object({
  item_type: billItemTypeEnum,
  service_id: z.string().uuid().optional().nullable(),
  package_id: z.string().uuid().optional().nullable(),
  product_id: z.string().uuid().optional().nullable(),
  employee_id: z.string().uuid().optional().nullable(),
  chair_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit_price: z.number().nonnegative('Unit price must be non-negative'),
  discount_amount: z.number().nonnegative().default(0),
  discount_percentage: z.number().min(0).max(100).default(0),
  notes: z.string().max(500).optional().nullable(),
}).refine(
  (data) => {
    if (data.item_type === 'service' && !data.service_id) return false;
    if (data.item_type === 'package' && !data.package_id) return false;
    if (data.item_type === 'product' && !data.product_id) return false;
    return true;
  },
  {
    message: 'Item ID is required for the specified item type',
  }
);

const paymentSchema = z.object({
  payment_mode: paymentModeEnum,
  amount: z.number().positive('Payment amount must be positive'),
  transaction_reference: z.string().max(100).optional().nullable(),
  bank_name: z.string().max(100).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const createBillSchema = z.object({
  body: z.object({
    customer_id: z.string().uuid('Invalid customer ID'),
    branch_id: z.string().uuid('Invalid branch ID'),
    items: z.array(billItemSchema).min(1, 'At least one item is required'),
    payments: z.array(paymentSchema).min(1, 'At least one payment is required'),
    discount_amount: z.number().nonnegative('Discount must be non-negative').default(0),
    discount_reason: z.string().max(200).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updateBillSchema = z.object({
  body: z.object({
    status: billStatusEnum.optional(),
    notes: z.string().max(1000).optional().nullable(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid bill ID'),
  }),
});

const getBillsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('20'),
    branch_id: z.string().uuid().optional(),
    customer_id: z.string().uuid().optional(),
    status: billStatusEnum.optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    search: z.string().optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
  }),
  params: z.object({}).optional(),
});

const getBillByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid bill ID'),
  }),
});

module.exports = {
  createBillSchema,
  updateBillSchema,
  getBillsSchema,
  getBillByIdSchema,
};
