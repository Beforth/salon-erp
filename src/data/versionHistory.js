export const CURRENT_VERSION = 'v2.0.0'

export const versionHistory = [
  {
    version: 'v2.0.0',
    date: 'Mar 2026',
    title: 'Finance & Inventory Expansion',
    highlights: [
      'Savings Pots for cash management',
      'Counter Withdrawals tracking',
      'UPI Account management',
      'Suppliers & Purchase Batches',
      'Product Incentive configuration',
      'Barcode scanning for products',
      '80mm thermal receipt printing',
      'Service Liability & Supplier Credit reports',
    ],
    details: [
      {
        section: 'Finance Module',
        items: [
          'Savings Pots — create pots, deposit, withdraw, and view full transaction history',
          'Counter Withdrawals — track cash removed from the counter with reason and approvals',
          'UPI Account management — add and manage UPI payment accounts for the salon',
        ],
      },
      {
        section: 'Inventory & Procurement',
        items: [
          'Suppliers — full supplier directory with contact details and credit tracking',
          'Purchase Batches — create purchase orders, track batches with cost price and quantities',
          'Barcode scanning — scan product barcodes during billing and inventory operations',
        ],
      },
      {
        section: 'Staff & Incentives',
        items: [
          'Product Incentives — configure per-product incentive rules for staff members',
        ],
      },
      {
        section: 'Billing & Receipts',
        items: [
          '80mm thermal receipt support — compact receipt layout optimized for thermal printers',
        ],
      },
      {
        section: 'Reports',
        items: [
          'Service Liability report — track outstanding service commitments from packages',
          'Supplier Credit report — monitor unpaid supplier balances',
        ],
      },
    ],
  },
  {
    version: 'v1.5.0',
    date: 'Feb 27, 2026',
    title: 'Bill Details & Staff CSV Export',
    highlights: [
      'Editable book number in bill detail',
      'CSV download in Staff Performance',
    ],
    details: [
      {
        section: 'Billing',
        items: [
          'Book number field is now editable directly from the bill detail page',
        ],
      },
      {
        section: 'Staff Performance',
        items: [
          'Download staff performance data as CSV for external analysis',
        ],
      },
    ],
  },
  {
    version: 'v1.4.0',
    date: 'Feb 22-25, 2026',
    title: 'Billing Enhancements & Expenses',
    highlights: [
      'Free service handling in bills',
      'Add customer directly from billing',
      'Expenses module',
      'Fuzzy search in item selection',
      'Book number field in bills',
      'IST date formatting throughout',
    ],
    details: [
      {
        section: 'Billing',
        items: [
          'Free service handling — mark services as free with reason tracking',
          'Add new customer directly from the billing page without navigating away',
          'Fuzzy search — quickly find services and products with approximate matching',
          'Book number field — assign physical bill book numbers to bills',
          'IST date formatting — all dates now display in Indian Standard Time',
        ],
      },
      {
        section: 'Finance',
        items: [
          'Expenses module — record and categorize salon expenses with date and notes',
        ],
      },
    ],
  },
  {
    version: 'v1.3.0',
    date: 'Feb 17-20, 2026',
    title: 'Service Selection & Printing',
    highlights: [
      'Optional service selection in bills',
      'Bill printing improvements',
      'Staff assets tab',
      'Package service filtering',
    ],
    details: [
      {
        section: 'Billing',
        items: [
          'Optional service selection — services can be individually toggled on/off in bills',
          'Bill printing improvements — cleaner layout and better formatting for printed bills',
        ],
      },
      {
        section: 'Staff',
        items: [
          'Assets tab — track equipment and tools assigned to each staff member',
        ],
      },
      {
        section: 'Packages',
        items: [
          'Service filtering — filter and search services when creating or editing packages',
        ],
      },
    ],
  },
  {
    version: 'v1.2.0',
    date: 'Feb 13, 2026',
    title: 'Salon Floor / Chair Management',
    highlights: [
      'Chair management system',
      'Real-time chair status tracking',
    ],
    details: [
      {
        section: 'Salon Floor',
        items: [
          'Chair Management — add, edit, and organize salon chairs/stations',
          'Real-time status tracking — see which chairs are occupied, available, or under maintenance',
        ],
      },
    ],
  },
  {
    version: 'v1.1.0',
    date: 'Feb 11, 2026',
    title: 'Performance & Management Tools',
    highlights: [
      'Employee star performance ratings',
      'Service & package management',
      'Bill receipt printing',
      'Customer ID formatting',
      'Frontend/backend architecture split',
    ],
    details: [
      {
        section: 'Staff',
        items: [
          'Star performance ratings — rate employee performance with a star-based system',
        ],
      },
      {
        section: 'Catalog',
        items: [
          'Service management — full CRUD for salon services with pricing and duration',
          'Package management — create service bundles with discounted pricing',
        ],
      },
      {
        section: 'Billing',
        items: [
          'Receipt printing — generate and print professional receipts from bill detail',
          'Customer ID formatting — cleaner display of customer identifiers',
        ],
      },
      {
        section: 'Architecture',
        items: [
          'Frontend/backend split — separated into independent deployable units',
        ],
      },
    ],
  },
  {
    version: 'v1.0.0',
    date: 'Feb 7-10, 2026',
    title: 'Initial Release',
    highlights: [
      'Dashboard with key metrics',
      'Customer management',
      'Billing system',
      'Services & Products catalog',
      'Inventory tracking',
      'Reports & Analytics',
      'Staff management',
      'Multi-branch support',
      'Settings & configuration',
    ],
    details: [
      {
        section: 'Dashboard',
        items: [
          'Role-based dashboards for Owner, Manager, Cashier, and Employee',
          'Key business metrics — revenue, bills, customer counts at a glance',
        ],
      },
      {
        section: 'Customers',
        items: [
          'Customer directory with search and filtering',
          'Customer detail pages with visit history and billing records',
        ],
      },
      {
        section: 'Billing',
        items: [
          'Create bills with services, packages, and products',
          'Multiple payment methods — cash, card, UPI',
          'Bill listing with status tracking (pending, completed, cancelled)',
        ],
      },
      {
        section: 'Catalog',
        items: [
          'Services — define salon services with name, price, duration, and category',
          'Products — manage retail products with stock tracking',
        ],
      },
      {
        section: 'Inventory',
        items: [
          'Stock level monitoring across branches',
          'Stock transfer between branches with approval workflow',
        ],
      },
      {
        section: 'Reports',
        items: [
          'Revenue reports with date range filtering',
          'Service and product performance analytics',
        ],
      },
      {
        section: 'Administration',
        items: [
          'Staff management with role-based access control',
          'Multi-branch setup and configuration',
          'Application settings and preferences',
        ],
      },
    ],
  },
]
