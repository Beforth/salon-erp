export const CURRENT_VERSION = 'v2.6.0'

export const versionHistory = [
  {
    version: 'v2.6.0',
    date: 'Mar 2026',
    title: 'Pending Services, Searchable Employees & Staff Access',
    highlights: [
      'Pending services overhaul — removed partial billing',
      'Same employee for all services in package billing',
      'Searchable employee dropdown in billing forms',
      'Staff performance visible to cashier and manager',
      'Optional time field on expenses',
      'Employee credit based on actual service date',
    ],
    details: [
      {
        section: 'Billing — Pending Services',
        items: [
          'Removed partial billing — bills are always fully completed with full payment upfront',
          'Individual services can be marked as "pending" during bill completion (to be performed later)',
          'Employee assignment is cleared for pending services — assigned when service is actually completed',
          'New "Pending Services" tab on Bills page showing all pending items with "Complete" action',
          '"Complete" button on pending items in bill detail page',
          'Revenue recognized at bill date regardless of pending services',
          'Employee credit attributed to the actual service date, not the bill date',
        ],
      },
      {
        section: 'Billing — Employee Selection',
        items: [
          '"Same employee for all services" checkbox for package billing — pick one employee for all services',
          'Searchable employee dropdown replaces native select in all billing forms',
          'Type to filter employees by name instead of scrolling through long lists',
          'Available in compact size for inline package service rows',
        ],
      },
      {
        section: 'Staff Performance',
        items: [
          'Staff performance page now accessible to cashier and manager roles',
          'Manager/cashier view shows service counts, star points, and daily averages only',
          'Financial data (earnings, sales, incentives, revenue chart) hidden for non-owner roles',
          'Branch auto-filtered for non-owner roles (no branch selector)',
          'CSV export restricted to owner/developer roles',
        ],
      },
      {
        section: 'Expenses',
        items: [
          'Optional time field added to expense creation and editing',
          'Time displayed alongside date in expenses list when present',
        ],
      },
      {
        section: 'Reporting',
        items: [
          'Employee performance reports use actual service date for credit attribution',
          'Pending items (no employee assigned) excluded from performance reports',
          'Services completed later appear in reports on their actual service date',
        ],
      },
    ],
  },
  {
    version: 'v2.5.0',
    date: 'Mar 2026',
    title: 'Expenses, Savings Pot Access & Staff Performance',
    highlights: [
      'Savings pot deposits auto-create expense records',
      'Manager & cashier roles can create, edit, and deposit into savings pots',
      'Staff performance matrix rows grouped by bill number',
      'Employee pills show earnings alongside star points',
      'Page totals in staff performance matrix',
      'Expenses page layout improvements',
      'UPI account dropdown fix in expense modal',
    ],
    details: [
      {
        section: 'Expenses',
        items: [
          'Auto-expense on savings pot deposit — each deposit batch creates an expense under "Savings Pot Deposit" category so it appears in expense reports',
          'Cascade delete — deleting a savings pot also removes its linked expense records',
          'Layout reorder — search and filters moved above stat cards for faster access',
          'Stat cards simplified — Total Expenses and Expense Count in a clean two-column row',
          'UPI dropdown fix — expense modal now correctly shows UPI account names when payment mode is UPI',
        ],
      },
      {
        section: 'Savings Pots — Role Access',
        items: [
          'Manager and cashier roles can now create new savings pots',
          'Manager and cashier roles can edit existing savings pots',
          'Cashier role can now make deposits (previously manager and above only)',
          'Edit button visibility based on manager/cashier/owner role',
          'Delete button restricted to owner role only',
          'Person management (add/edit/delete) remains owner-only',
        ],
      },
      {
        section: 'Staff Performance',
        items: [
          'Employee pills show service earnings next to star points for quick comparison',
          'Matrix column headers show star points instead of service count',
          'Matrix rows grouped by bill number — collapsed by default, click to expand individual bills',
          'Single-service bills render as simple rows without expand/collapse',
          'Multi-service bills show a summary parent row with summed amounts per employee',
          'Page total footer row — shows per-employee totals for the current page',
        ],
      },
    ],
  },
  {
    version: 'v2.4.0',
    date: 'Mar 2026',
    title: 'Savings Pot Validation, Hard Delete & Timestamps',
    highlights: [
      'Duplicate account number validation on savings pots',
      'Hard delete for savings pots with confirmation dialog',
      'Full timestamps on deposits and withdrawals',
      'Styled confirmation dialog replaces browser popups',
    ],
    details: [
      {
        section: 'Savings Pots',
        items: [
          'Duplicate account number check — friendly error when creating or editing a pot with an account number already in use',
          'Hard delete — deleting a pot now permanently removes it along with all deposit and withdrawal records (previously soft-deleted)',
          'Full timestamps — deposit and withdrawal dates now store the exact date and time instead of date only',
          'Inactive pot cleanup — all previously soft-deleted pots have been permanently removed from the database',
        ],
      },
      {
        section: 'UI Improvements',
        items: [
          'Confirmation dialog — styled modal with warning icon replaces browser confirm() popups for delete actions',
          'Loading state shown on confirm button while delete is in progress',
          'Reusable ConfirmDialog component with destructive and default variants',
        ],
      },
    ],
  },
  {
    version: 'v2.3.0',
    date: 'Mar 2026',
    title: 'Savings Pot Persons, Cash Drawer & Setup Guide',
    highlights: [
      'Savings Pot person management with grouped accordion view',
      'Cash drawer overhaul with opening balance carry-forward',
      '"Other" text fields for expense category & payment mode',
      'Setup checklist in Settings for system prerequisites',
      'Bill number column in Staff Performance services-by-time',
      'Employee removal on billing page packages',
    ],
    details: [
      {
        section: 'Savings Pots',
        items: [
          'Person management — create, edit, delete persons who own savings pots (branch-scoped)',
          'Grouped accordion view — persons as collapsible sections, each showing their pots with totals',
          'Person-scoped deposits — select person in deposit modal, only their pots shown for allocation',
          'Branch auto-inferred from person when creating a new pot — no separate branch dropdown needed',
          'Payment mode on deposits — track cash, card, UPI, online, or other (only cash affects drawer)',
        ],
      },
      {
        section: 'Cash Drawer',
        items: [
          'Opening balance carry-forward — uses last reconciliation actual cash, or branch starting balance, or zero',
          'Cash reconciliation records — upsert per branch per date, replaces old CashSource approach',
          'Starting cash balance — owner sets once per branch as the initial seed value',
          'Dashboard cash status — per-branch cash drawer overview on Owner Dashboard',
          'Savings pot cash deposits now subtracted from expected cash in daily summary',
        ],
      },
      {
        section: 'Expenses',
        items: [
          '"Other" category text box — specify custom category name when expense category is "Others"',
          '"Other" payment mode text box — specify custom payment method when mode is "other"',
          'Both fields displayed inline in the expenses list and included in expense records',
        ],
      },
      {
        section: 'Settings & Setup',
        items: [
          'Setup Guide tab in Settings — checklist of prerequisites to make the system work correctly',
          'Progress bar showing completion status across 9 setup items',
          'Three tiers: Essential (branches, employees, services), Recommended (chairs, business info, cash balance), Optional (UPI, categories, savings persons)',
          'Direct links to relevant pages for each incomplete setup item',
          'Counter Withdrawals and Bank Receipts hidden from sidebar navigation (data preserved)',
        ],
      },
      {
        section: 'Billing & Staff',
        items: [
          'Bill number column in Staff Performance services-by-time table and CSV export',
          'Employee removal buttons on package service slots in billing page (add and remove employees)',
        ],
      },
    ],
  },
  {
    version: 'v2.2.0',
    date: 'Mar 2026',
    title: 'Privacy, Branch Colors & Bank Receipts',
    highlights: [
      'Mobile-friendly sidebar navigation',
      'Role-based phone number privacy',
      'UPI account selection in expenses',
      'Branch color coding across the app',
      'Savings pot account numbers',
      'Bank Receipts page for cashiers',
    ],
    details: [
      {
        section: 'Mobile Experience',
        items: [
          'Slide-out navigation drawer on mobile — hamburger menu now opens a proper sidebar with smooth animation',
          'Auto-close drawer on page navigation for seamless browsing',
          'Tap-to-dismiss backdrop overlay when drawer is open',
          'Correct z-index layering so drawer renders above header and content',
        ],
      },
      {
        section: 'Privacy & Security',
        items: [
          'Phone numbers masked for cashier and employee roles — password-style input on forms, masked display in lists',
          'Admin and manager roles retain full phone number visibility',
        ],
      },
      {
        section: 'Finance',
        items: [
          'UPI account selection when recording UPI expenses — dropdown of active accounts with validation',
          'UPI account name displayed alongside payment mode in expense list',
          'Savings pots now require an account number — displayed prominently on pot cards',
          'Active/Inactive status badge always shown on savings pot cards',
          'Bank Receipts — new dedicated page for viewing and editing bank deposit records',
          'Cashiers can view last 3 days of bank deposits with edit access controlled per record',
          'Admin/Manager can view full deposit history with date and branch filters',
        ],
      },
      {
        section: 'Branch Management',
        items: [
          'Branch color picker — assign a hex color to each branch from branch settings',
          'Color-coded branch dots displayed across Staff list, Staff Performance, Branches, Counter Withdrawals, and Owner Dashboard',
          'Multi-branch employees show multiple color dots in performance reports',
        ],
      },
    ],
  },
  {
    version: 'v2.1.0',
    date: 'Mar 2026',
    title: 'Billing UI Redesign',
    highlights: [
      'Collapsible sidebar navigation (global)',
      'Single-screen POS-style billing layout',
      'Cart + Checkout merged into one panel',
      'Compact inline employee assignment for packages',
      'Two-column service grid in cart for packages',
      'Payment modes show icon + label text',
    ],
    details: [
      {
        section: 'Collapsible Sidebar (Global)',
        items: [
          'Sidebar toggles between full width (256px) and icon-only rail (64px)',
          'Flyout menus on hover for grouped nav items when collapsed',
          'Collapse/expand toggle button at bottom of sidebar',
          'Content area max-width constraint removed when sidebar is collapsed',
        ],
      },
      {
        section: 'Billing Page — Layout Overhaul',
        items: [
          'Sidebar auto-collapses on billing page entry, restores on exit',
          'Top section condensed from a full Card to a compact inline strip',
          'Bottom checkout bar eliminated — merged into the right cart panel',
          'Cart panel widened from 400px to 480px for better content density',
          'Barcode scanner only shown when Products tab is selected',
        ],
      },
      {
        section: 'Package UX Improvements',
        items: [
          'Inline single-row employee assignment — service name, price, and staff dropdowns on one row',
          'OR group service selector and employees on one compact row',
          'Package services in cart displayed in a two-column grid layout',
          'Employee name badges styled with primary color and white text for visibility',
        ],
      },
      {
        section: 'Payment & Checkout',
        items: [
          'Payment mode buttons show icon + label text (Cash, Card, UPI) instead of icon-only',
          'Discount, payment splits, notes, and submit buttons in scrollable cart panel',
          'Sticky cart header and submit buttons — always visible while cart content scrolls',
        ],
      },
    ],
  },
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
