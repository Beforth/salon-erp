const { z } = require('zod');

const createServiceCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    parent_id: z.string().uuid().optional().nullable(),
    display_order: z.number().int().nonnegative().default(0),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const createServiceSchema = z.object({
  body: z.object({
    service_name: z.string().min(1, 'Service name is required').max(100),
    category_id: z.string().uuid().optional().nullable(),
    price: z.number().nonnegative('Price must be non-negative'),
    duration_minutes: z.number().int().positive().optional().nullable(),
    star_points: z.number().int().nonnegative().default(0),
    description: z.string().max(1000).optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    is_active: z.boolean().default(true),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updateServiceSchema = z.object({
  body: z.object({
    service_name: z.string().min(1).max(100).optional(),
    category_id: z.string().uuid().optional().nullable(),
    price: z.number().nonnegative().optional(),
    duration_minutes: z.number().int().positive().optional().nullable(),
    star_points: z.number().int().nonnegative().optional(),
    description: z.string().max(1000).optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    is_active: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid service ID'),
  }),
});

const getServicesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    category_id: z.string().uuid().optional(),
    is_active: z.string().optional(),
    search: z.string().optional(),
  }),
  params: z.object({}).optional(),
});

const packageServiceSchema = z.object({
  service_id: z.string().uuid('Invalid service ID'),
  quantity: z.number().int().positive().default(1),
  service_price: z.number().nonnegative().optional().nullable(),
});

const createPackageSchema = z.object({
  body: z.object({
    package_name: z.string().min(1, 'Package name is required').max(255),
    package_price: z.number().nonnegative('Price must be non-negative'),
    validity_days: z.number().int().positive().optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    is_active: z.boolean().default(true),
    services: z.array(packageServiceSchema).default([]),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updatePackageSchema = z.object({
  body: z.object({
    package_name: z.string().min(1).max(100).optional(),
    package_price: z.number().nonnegative().optional(),
    validity_days: z.number().int().positive().optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    is_active: z.boolean().optional(),
    services: z.array(packageServiceSchema).min(1).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({
    id: z.string().uuid('Invalid package ID'),
  }),
});

module.exports = {
  createServiceCategorySchema,
  createServiceSchema,
  updateServiceSchema,
  getServicesSchema,
  createPackageSchema,
  updatePackageSchema,
};
