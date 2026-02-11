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
    star_points: z.coerce.number().int().min(0).default(0),
    description: z.string().max(1000).optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    is_multi_employee: z.coerce.boolean().default(false),
    employee_count: z.number().int().min(2).max(20).optional().nullable(),
    is_active: z.boolean().default(true),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updateServiceSchema = z.object({
  body: z
    .object({
      service_name: z.string().min(1).max(100).optional(),
      category_id: z.string().uuid().optional().nullable(),
      price: z.number().nonnegative().optional(),
      duration_minutes: z.number().int().positive().optional().nullable(),
      star_points: z.coerce.number().int().min(0).optional(),
      description: z.string().max(1000).optional().nullable(),
      image_url: z.string().url().optional().nullable(),
      is_multi_employee: z.coerce.boolean().optional(),
      employee_count: z.number().int().min(2).max(20).optional().nullable(),
      is_active: z.boolean().optional(),
    })
    .passthrough(),
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
  quantity: z.coerce.number().int().positive().default(1),
  service_price: z.coerce.number().nonnegative().optional().nullable(),
});

const serviceGroupSchema = z.object({
  group_label: z.string().min(1, 'Group label is required').max(255),
  services: z.array(packageServiceSchema).min(1, 'Add at least one service to the group'),
});

const createPackageCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    display_order: z.number().int().nonnegative().default(0),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const createPackageSchema = z.object({
  body: z.object({
    package_name: z.string().min(1, 'Package name is required').max(255),
    category_id: z.string().uuid().optional().nullable(),
    package_price: z.number().nonnegative('Price must be non-negative').optional().nullable(),
    validity_days: z.number().int().positive().optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    is_active: z.boolean().default(true),
    services: z.array(packageServiceSchema).default([]),
    service_groups: z.array(serviceGroupSchema).default([]),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

const updatePackageSchema = z.object({
  body: z.object({
    package_name: z.string().min(1).max(100).optional(),
    category_id: z.string().uuid().optional().nullable(),
    package_price: z.number().nonnegative().optional().nullable(),
    validity_days: z.number().int().positive().optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    image_url: z.string().url().optional().nullable(),
    is_active: z.boolean().optional(),
    services: z.array(packageServiceSchema).optional(),
    service_groups: z.array(serviceGroupSchema).optional(),
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
  createPackageCategorySchema,
  createPackageSchema,
  updatePackageSchema,
};
