const { z } = require('zod');

const genderEnum = z.enum(['male', 'female', 'other']);
const ageCategoryEnum = z.enum(['kid', 'teen', 'young', 'old']);

const createCustomerSchema = z.object({
  body: z.object({
    customer_name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be at most 100 characters'),
    phone: z
      .string()
      .regex(/^[0-9]{10}$/, 'Phone must be a 10-digit number')
      .optional()
      .nullable(),
    email: z.string().email('Invalid email address').optional().nullable(),
    gender: genderEnum.optional().nullable(),
    age_category: ageCategoryEnum.optional().nullable(),
    date_of_birth: z.string().optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    city: z.string().max(50).optional().nullable(),
    pincode: z.string().max(10).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updateCustomerSchema = z.object({
  body: z.object({
    customer_name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be at most 100 characters')
      .optional(),
    phone: z
      .string()
      .regex(/^[0-9]{10}$/, 'Phone must be a 10-digit number')
      .optional()
      .nullable(),
    email: z.string().email('Invalid email address').optional().nullable(),
    gender: genderEnum.optional().nullable(),
    age_category: ageCategoryEnum.optional().nullable(),
    date_of_birth: z.string().optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    city: z.string().max(50).optional().nullable(),
    pincode: z.string().max(10).optional().nullable(),
    notes: z.string().max(1000).optional().nullable(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid customer ID'),
  }),
});

const getCustomersSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.string().optional().default('1'),
    limit: z.string().optional().default('20'),
    search: z.string().optional(),
    gender: genderEnum.optional(),
    age_category: ageCategoryEnum.optional(),
    sort_by: z.string().optional(),
    sort_order: z.enum(['asc', 'desc']).optional(),
  }),
  params: z.object({}).optional(),
});

const getCustomerByIdSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid customer ID'),
  }),
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  getCustomersSchema,
  getCustomerByIdSchema,
};
