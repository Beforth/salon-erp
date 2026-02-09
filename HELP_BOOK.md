# Salon ERP - Help Book

A comprehensive guide to using the Salon ERP system for salon and beauty parlor management.

---

## Table of Contents

1. [Prerequisites & Setup](#1-prerequisites--setup)
2. [Getting Started](#2-getting-started)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Dashboard](#4-dashboard)
5. [Branch Management](#5-branch-management)
6. [Staff Management](#6-staff-management)
7. [Service Management](#7-service-management)
8. [Package Management](#8-package-management)
9. [Customer Management](#9-customer-management)
10. [Billing](#10-billing)
11. [Inventory & Products](#11-inventory--products)
12. [Cash Reconciliation](#12-cash-reconciliation)
13. [Reports & Analytics](#13-reports--analytics)
14. [Settings](#14-settings)
15. [Troubleshooting & FAQ](#15-troubleshooting--faq)

---

## 1. Prerequisites & Setup

### System Requirements

| Component      | Requirement                      |
|----------------|----------------------------------|
| Node.js        | v20 or higher                    |
| PostgreSQL     | v14 or higher                    |
| Redis          | v6 or higher (optional, for caching) |
| Browser        | Chrome, Firefox, Safari, Edge (latest) |
| OS             | Windows, macOS, or Linux         |

### Software Dependencies

**Backend:**
- Express.js 4.18 (web framework)
- Prisma ORM 5.10 (database access)
- JWT for authentication
- Zod for input validation

**Frontend:**
- React 18 with Vite (build tool)
- Radix UI + Tailwind CSS (UI components)
- React Query (server state management)
- Redux Toolkit (client state management)

### Installation Steps

#### 1. Clone the Repository
```bash
git clone <repository-url>
cd salon-erp
```

#### 2. Set Up the Backend
```bash
cd backend
npm install
```

#### 3. Configure Environment Variables
Create a `.env` file in the `backend/` directory:
```env
NODE_ENV=development
PORT=5001

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/salon_erp?schema=public"

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=30d

# CORS
CORS_ORIGIN=http://localhost:5174

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info
```

#### 4. Initialize the Database
```bash
npm run db:migrate     # Run database migrations
npm run db:generate    # Generate Prisma client
npm run db:seed        # Seed default data (branches, users)
```

#### 5. Start the Backend Server
```bash
npm run dev            # Starts on port 5001
```

#### 6. Set Up the Frontend
```bash
cd ../frontend
npm install
npm run dev            # Starts on port 5174
```

#### 7. Access the Application
Open your browser and go to: `http://localhost:5174`

### Default Login Credentials

After seeding, these accounts are available (password for all: `Password123!`):

| Username    | Role      | Branch              |
|-------------|-----------|---------------------|
| owner       | Owner     | All branches        |
| developer   | Developer | All branches        |
| manager1    | Manager   | Salon Branch 1      |
| manager2    | Manager   | Salon Branch 2      |
| cashier1    | Cashier   | Salon Branch 1      |
| employee1   | Employee  | Salon Branch 1      |
| employee2   | Employee  | Salon Branch 1      |

### Default Branches (Seeded)

| Code  | Name            | Location                 |
|-------|-----------------|--------------------------|
| SB001 | Salon Branch 1  | Pimpri, Maharashtra      |
| SB002 | Salon Branch 2  | Chinchwad, Maharashtra   |

---

## 2. Getting Started

### Logging In

1. Open the application in your browser.
2. Enter your **Username** (or email) and **Password**.
3. Click **Login**.
4. You will be redirected to your role-specific dashboard.

> **Tip:** Use the eye icon next to the password field to toggle password visibility.

### Navigation

The application has a **sidebar** on the left that shows menu items based on your role:

| Menu Item      | Owner | Manager | Cashier | Employee |
|----------------|:-----:|:-------:|:-------:|:--------:|
| Dashboard      |   Y   |    Y    |    Y    |    Y     |
| Customers      |   Y   |    Y    |    Y    |    -     |
| Billing        |   Y   |    Y    |    Y    |    -     |
| Services       |   Y   |    Y    |    -    |    -     |
| Packages       |   Y   |    Y    |    -    |    -     |
| Inventory      |   Y   |    Y    |    -    |    -     |
| Reports        |   Y   |    Y    |    -    |    -     |
| Cash Drawer    |   Y   |    Y    |    Y    |    -     |
| Staff          |   Y   |    Y    |    -    |    -     |
| Branches       |   Y   |    -    |    -    |    -     |
| Settings       |   Y   |    -    |    -    |    -     |

The **header bar** at the top displays:
- Your branch name (if applicable)
- Notification bell
- User avatar with a dropdown menu (Profile, Settings, Logout)

On mobile devices, the sidebar collapses into a hamburger menu.

### Logging Out

Click on your avatar in the top-right corner and select **Logout** from the dropdown menu.

---

## 3. User Roles & Permissions

The system supports six user roles, each with different levels of access:

### Owner
- Full access to all features across all branches.
- Can create and manage branches, staff, services, products, and settings.
- Can view all reports and analytics.

### Developer
- Same access as Owner, plus system-level settings.
- Intended for technical administrators.

### Manager
- Manages operations within their assigned branch.
- Can manage customers, create bills, manage services/products/inventory.
- Can view reports and manage staff within their branch.
- Cannot create new branches or modify system settings.

### Cashier
- Can create bills and manage customers.
- Can view services and packages (read-only).
- Can perform cash reconciliation.
- Cannot manage services, products, or staff.

### Employee
- View-only access to their own dashboard.
- Can see their personal performance metrics, services done, and attendance.
- Cannot create bills or manage any data.

### Vendor (Backend Only)
- Read-only access to products and inventory.
- Used for supplier integrations.

### Permission Summary

| Action                     | Owner | Developer | Manager | Cashier | Employee |
|----------------------------|:-----:|:---------:|:-------:|:-------:|:--------:|
| Create/Edit branches       |   Y   |     Y     |    -    |    -    |    -     |
| Create/Edit staff          |   Y   |     Y     |    Y    |    -    |    -     |
| Delete/Deactivate staff    |   Y   |     Y     |    -    |    -    |    -     |
| Create/Edit services       |   Y   |     Y     |    Y    |    -    |    -     |
| Create/Edit packages       |   Y   |     Y     |    Y    |    -    |    -     |
| Create/Edit products       |   Y   |     Y     |    Y    |    -    |    -     |
| Create bills               |   Y   |     Y     |    Y    |    Y    |    -     |
| Update/Cancel bills        |   Y   |     Y     |    Y    |    -    |    -     |
| Create customers           |   Y   |     Y     |    Y    |    Y    |    -     |
| Edit customers             |   Y   |     Y     |    Y    |    -    |    -     |
| Manage inventory           |   Y   |     Y     |    Y    |    -    |    -     |
| View reports               |   Y   |     Y     |    Y    |    -    |    -     |
| View daily sales report    |   Y   |     Y     |    Y    |    Y    |    -     |
| Cash reconciliation        |   Y   |     Y     |    Y    |    Y    |    -     |
| System settings            |   Y   |     Y     |    -    |    -    |    -     |
| View own dashboard         |   Y   |     Y     |    Y    |    Y    |    Y     |

---

## 4. Dashboard

Each role sees a customized dashboard upon login.

### Owner Dashboard

**Prerequisites:** Logged in as Owner or Developer.

**What you see:**
- **4 Stats Cards** showing monthly data with trend indicators:
  - **Total Revenue** - Total revenue for the current month with percentage change from last month.
  - **Total Bills** - Number of bills created this month with trend.
  - **Active Customers** - Customers who visited this month with trend.
  - **Average Bill Value** - Average amount per bill with trend.
- **Low Stock Alerts** - Products that have fallen below their reorder level. Click to navigate to inventory.
- **Quick Navigation Links** to key pages.

### Manager Dashboard

**Prerequisites:** Logged in as Manager.

**What you see:**
- **Today's Revenue** - Total sales amount and bill count for today.
- **Staff Present** - Attendance count for the day.
- **Today's Customers** - Customer count with new customer indicator.
- **Pending Bills** - Bills that are still in pending/draft status.
- **Low Stock Alerts** - Products below reorder level.
- **Top Performers** - Employee ranking by services, stars, and revenue.
- **Quick Actions** - Buttons for "Create Bill" and "View Customers".

### Cashier Dashboard

**Prerequisites:** Logged in as Cashier.

**What you see:**
- **Today's Stats** - Total Sales, Bills Created, Pending Bills.
- **Payment Breakdown** - Amount collected via Cash, Card, and UPI.
- **Recent Bills** - Table showing the last 4 bills with customer name, amount, and time.
- **Quick Actions** - "Add Customer", "View Bills", "Cash Reconciliation".

### Employee Dashboard

**Prerequisites:** Logged in as Employee.

**What you see:**
- **Today's Stats** - Services Done, Stars Earned, Hours Worked.
- **Monthly Performance Card:**
  - Services completed this month
  - Total stars earned
  - Revenue generated
  - Attendance (days present / working days)
  - Expected bonus amount
- **Today's Services** - List of services performed today with star ratings.
- **Attendance Progress** - Visual progress bar showing attendance percentage.

---

## 5. Branch Management

**Prerequisites:** Must be logged in as **Owner** or **Developer**.

Branches represent physical salon locations. Each branch operates semi-independently with its own staff, services, and inventory.

### Viewing Branches

1. Click **Branches** in the sidebar.
2. You will see a table listing all branches with:
   - Branch Name
   - Code (unique identifier like SB001)
   - Location (address, city, state, pincode)
   - Contact (phone, email)
   - Status (Active / Inactive)

### Creating a New Branch

1. Click **Branches** in the sidebar.
2. Click the **Add Branch** button (top right).
3. Fill in the branch details:

| Field         | Required | Description                                 |
|---------------|:--------:|---------------------------------------------|
| Branch Name   |    Y     | Display name (e.g., "Downtown Salon")       |
| Code          |    Y     | Unique identifier (e.g., "DS001")           |
| Address       |    -     | Street address                              |
| City          |    -     | City name                                   |
| State         |    -     | State/Province                              |
| Pincode       |    -     | Postal/ZIP code                             |
| Phone         |    -     | Branch contact phone                        |
| Email         |    -     | Branch contact email                        |
| Manager       |    -     | Assign a manager from existing users        |
| Active        |    -     | Toggle on/off (default: active)             |

4. Click **Create** to save the branch.

### Editing a Branch

1. Go to the Branches list.
2. Click the **Edit** (pencil) icon on the branch row.
3. Modify the desired fields.
4. Click **Update** to save changes.

> **Important:** The branch Code must be unique across the system. It is used in bill number generation (e.g., `SB001-20240115-001`).

---

## 6. Staff Management

**Prerequisites:** Must be logged in as **Owner**, **Developer**, or **Manager**.

### Viewing Staff

1. Click **Staff** in the sidebar.
2. Use the filters to narrow down the list:
   - **Search** - Search by name or email.
   - **Role** - Filter by role (Owner, Manager, Cashier, Employee).
   - **Branch** - Filter by branch (Owners only).
   - **Status** - Show Active, Inactive, or All.
3. The table shows:
   - Name (with avatar initial)
   - Email
   - Role (color-coded badge)
   - Branch
   - Status
   - Last Login

### Adding a New Staff Member

1. Click **Staff** in the sidebar.
2. Click the **Add User** button.
3. Fill in the staff details:

| Field     | Required | Description                                            |
|-----------|:--------:|--------------------------------------------------------|
| Full Name |    Y     | Staff member's full name                               |
| Email     |    Y     | Valid email address (must be unique)                   |
| Username  |    Y     | Login username (must be unique)                        |
| Password  |    Y     | Minimum 8 characters, with uppercase, lowercase, digit |
| Role      |    Y     | Select: Owner, Developer, Manager, Cashier, Employee   |
| Branch    |  Y*      | Required for Manager, Cashier, Employee roles          |
| Phone     |    -     | Contact phone number                                   |
| Status    |    -     | Active/Inactive toggle (default: active)               |

4. Click **Create** to add the staff member.

> **Note:** Owner and Developer roles do not require a branch assignment as they have access to all branches.

### Editing a Staff Member

1. Find the staff member in the list.
2. Click the **Edit** (pencil) icon.
3. Modify the desired fields.
4. To change the password, enter a new one in the Password field. Leave it blank to keep the current password.
5. Click **Update** to save.

### Deactivating a Staff Member

1. Find the staff member in the list.
2. Click the **Delete** (trash) icon.
3. This will deactivate the user (soft delete - they cannot log in but their data is preserved).

> **Important:** Only Owners and Developers can deactivate staff members.

---

## 7. Service Management

**Prerequisites:**
- Must be logged in as **Owner**, **Developer**, or **Manager**.
- At least one **Branch** must exist.
- At least one **Service Category** must exist (create one first if needed).

Services are the core offerings of the salon (e.g., Haircut, Facial, Manicure).

### Viewing Services

1. Click **Services** in the sidebar.
2. Use the search bar to filter by service name.
3. Owners can also filter by **Branch**.
4. The table shows:
   - Service Name
   - Category
   - Branch (Owner view only)
   - Price (in INR)
   - Duration (in minutes)
   - Star Points (loyalty points earned)
   - Status (Active / Inactive)

### Creating a Service Category

Before creating services, you need at least one category (e.g., "Hair", "Skin", "Nails").

1. Click **Services** in the sidebar.
2. Click the **Add Category** button.
3. Fill in:

| Field         | Required | Description                        |
|---------------|:--------:|------------------------------------|
| Category Name |    Y     | E.g., "Hair Services", "Facials"   |
| Branch        |  Y*      | Select branch (Owner selects; others auto-filled) |

4. Click **Create**.

### Creating a Service

1. Click **Services** in the sidebar.
2. Click the **Add Service** button.
3. Fill in:

| Field        | Required | Description                                      |
|--------------|:--------:|--------------------------------------------------|
| Service Name |    Y     | E.g., "Men's Haircut", "Bridal Makeup"           |
| Category     |    Y     | Select from existing categories                  |
| Branch       |  Y*      | Select branch (Owner selects; others auto-filled)|
| Price        |    Y     | Service price in INR                             |
| Duration     |    -     | Time in minutes (e.g., 30, 60)                   |
| Star Points  |    -     | Loyalty points for this service (default: 0)     |
| Description  |    -     | Additional details about the service             |
| Active       |    -     | Toggle on/off (default: active)                  |

4. Click **Create**.

> **Note:** Categories are branch-specific. When you select a branch, only categories for that branch are shown.

### Editing a Service

1. Find the service in the list.
2. Click the **Edit** (pencil) icon.
3. Modify the desired fields.
4. Click **Update**.

> **Tip:** Set a service to "Inactive" to hide it from the billing page without deleting it.

---

## 8. Package Management

**Prerequisites:**
- Must be logged in as **Owner**, **Developer**, or **Manager**.
- **Services** must already exist (packages are combinations of services).

Packages bundle multiple services at a discounted price (e.g., "Bridal Package" = Haircut + Facial + Manicure + Pedicure).

### Viewing Packages

1. Click **Packages** in the sidebar.
2. The table shows:
   - Package Name (with description if available)
   - Services (badge list showing included services, "+X more" if many)
   - Individual Price (sum of all service prices)
   - Package Price (discounted price)
   - Savings (amount saved, green badge)
   - Validity (in days)
   - Status (Active / Inactive)

### Creating a Package

1. Click **Packages** in the sidebar.
2. Click the **Add Package** button.
3. Fill in the package details:

| Field         | Required | Description                                          |
|---------------|:--------:|------------------------------------------------------|
| Package Name  |    Y     | E.g., "Bridal Package", "Men's Grooming Combo"       |
| Description   |    -     | Details about what's included                        |
| Package Price |    Y     | Discounted price for the bundle (must be > 0)        |
| Validity Days |    -     | How long the package is valid (default: 365 days)    |
| Active        |    -     | Toggle on/off                                        |

4. **Add Services to the Package:**
   - Click **Add Service** in the services section.
   - Check the services you want to include.
   - Set the **Quantity** for each service (e.g., 2x Facial).
   - The system will show the individual price total in real-time.

5. Review the **Savings Summary** at the bottom:
   - Individual Price: Total if services were purchased separately.
   - Package Price: Your set price.
   - Savings: The difference.

6. Click **Create**.

### Editing a Package

1. Find the package in the list.
2. Click the **Edit** (pencil) icon.
3. Modify name, price, services, or validity.
4. Click **Update**.

### Package Types

The system supports two types of packages:

- **Linked Packages** - Packages with explicitly linked `PackageService` records. Each service is tracked individually. When added to a bill, each service expands as a separate line item with price distributed proportionally.

- **Flat Packages** - Legacy packages whose name contains services separated by "+" (e.g., "Haircut + Shave + Facial"). Price is split equally among the services. These are parsed automatically by the billing system.

---

## 9. Customer Management

**Prerequisites:**
- Must be logged in as **Owner**, **Developer**, **Manager**, or **Cashier**.

### Viewing Customers

1. Click **Customers** in the sidebar.
2. Use the **Search** bar to find customers by name or phone number.
3. The table shows:
   - Customer Name
   - Phone (partially masked for privacy)
   - Gender
   - Total Visits
   - Total Spent (in INR)
   - Last Visit date
4. Use pagination controls at the bottom to navigate pages (20 per page).

### Adding a New Customer

1. Click **Customers** in the sidebar.
2. Click the **Add Customer** button.
3. Fill in the customer details:

| Field         | Required | Description                                       |
|---------------|:--------:|---------------------------------------------------|
| Name          |    Y     | Customer's full name (2-100 characters)           |
| Phone         |    Y     | 10-digit phone number                             |
| Email         |    -     | Email address                                     |
| Gender        |    -     | Male, Female, or Other                            |
| Age Category  |    -     | Child, Teen, Young, Middle, Senior                |
| Date of Birth |    -     | Customer's birthday                               |
| Address       |    -     | Street address (max 500 characters)               |
| City          |    -     | City name                                         |
| Pincode       |    -     | Postal code                                       |
| Notes         |    -     | Any additional notes (max 1000 characters)        |

4. Click **Create**.

### Editing a Customer

1. Find the customer in the list.
2. Click the **Edit** (pencil) icon.
3. Modify the desired fields.
4. Click **Update**.

> **Note:** Only Owners, Developers, and Managers can edit customers. Cashiers can only create new customers.

### Viewing Customer Details

1. Click on a customer's **name** in the list, or click the **View** (eye) icon.
2. The detail page shows:
   - **Contact Information** - Phone, Email
   - **Address** - Full address details
   - **Personal Info** - Gender, Age Category, Date of Birth
   - **Statistics** - Total Visits, Total Spent, Last Visit, Average Bill Value
   - **Bill History** - Complete list of all bills for this customer (paginated, 10 per page)
3. Click any bill number to view the full bill details.
4. Click **Edit** in the header to modify customer information.

---

## 10. Billing

**Prerequisites:**
- Must be logged in as **Owner**, **Developer**, **Manager**, or **Cashier**.
- At least one **Customer** must exist.
- At least one **Branch** must exist.
- **Services**, **Packages**, or **Products** must be set up to add items to a bill.
- **Employees** must be assigned to the branch for employee selection.

The billing module is the core transactional feature of the system.

### Viewing Bills

1. Click **Billing** in the sidebar.
2. Use the **Search** bar to find bills by bill number or customer name.
3. The table shows:
   - Bill Number (formatted, e.g., SB001-20240115-001)
   - Customer Name (clickable - navigates to customer details)
   - Branch
   - Date
   - Total Amount (in INR)
   - Status (Completed, Pending, Draft, Cancelled)
4. Click the **View** button on any row to see full bill details.

### Exporting Bills

From the bills list page, you can export data in three formats:

- **CSV** - Comma-separated values file for spreadsheets.
- **Excel** - Excel file with formatted title.
- **PDF** - PDF document with summary cards and table.

### Creating a New Bill

#### Step 1: Choose Bill Type

Click one of the two buttons at the top of the bills page:

- **Current Bill** - Creates a bill with today's date and current time. Use this for walk-in customers.
- **Previous Bill** - Allows you to select a past date and time. Use this for backdating entries.

#### Step 2: Select Customer

1. In the customer field, start typing the customer's name (minimum 2 characters).
2. A dropdown will appear with matching customers.
3. Click on the customer to select them.

> **Tip:** If the customer doesn't exist, go to the Customers page to create them first, then return to billing.

#### Step 3: Select Branch

- **Managers/Cashiers:** Your branch is auto-selected.
- **Owners/Developers:** Select the branch from the dropdown.

#### Step 4: Add Items

The item selection area has **three tabs**: Services, Packages, and Products.

**Adding a Service:**
1. Click the **Services** tab.
2. Browse or scroll to find the service.
3. Each service shows: Name, Price, Duration, Category.
4. Click on a service to select it.
5. In the form that appears:
   - **Price** - Pre-filled with service price (editable for custom pricing).
   - **Quantity** - Default is 1.
   - **Employee** - Check one or more employees who will perform the service.
6. Click **Add to Cart**.

**Adding a Package:**
1. Click the **Packages** tab.
2. Browse available packages.
3. Each package shows: Name, Description, Individual Price, Package Price, Savings.
4. Click on a package to select it.
5. The package will expand into its component services.
6. For each service in the package, assign an **Employee**.
7. Click **Add to Cart**.

**Adding a Product:**
1. Click the **Products** tab.
2. Browse retail products.
3. Each product shows: Name, Brand, Stock Available, Price.
4. Click on a product to select it.
5. Set **Price** and **Quantity**.
6. Optionally assign an employee.
7. Click **Add to Cart**.

#### Step 5: Manage the Cart

The cart appears on the **right panel** and shows all added items:

- **Package items** are grouped together visually.
- Each item shows: Name, Unit Price, Quantity, Discount %, Subtotal.

**Editing an Item:**
1. Click the **Edit** (pencil) icon on an item.
2. For single items (services/products), the edit modal shows:
   - Price (editable)
   - Quantity
   - Discount % (per item)
   - Employee checkboxes
3. For packages, the edit modal shows:
   - All services in the package
   - Per-service employee assignment
   - Per-service discount
4. Click **Save** to apply changes.

**Removing an Item:**
- Click the **Remove** (X/trash) icon on a single item.
- For packages, you can remove the entire package group.

#### Step 6: Apply Discounts

**Item-Level Discount:**
- Set a discount % for each item individually via the cart or edit modal.

**Bill-Level Discount:**
- In the checkout section (bottom left), enter a **Bill Discount %**.
- The system calculates: Bill Discount Amount = (Subtotal - Item Discounts) x Discount %.
- Optionally enter a **Discount Reason** (e.g., "Loyalty customer", "Festival offer").

#### Step 7: Add Payments

In the checkout section (bottom right):

1. Select a **Payment Mode**: Cash, Card, or UPI.
2. Enter the **Amount**.
3. Click **Set Full Amount** to auto-fill the remaining balance.
4. To split payment across multiple modes:
   - Click **Add Payment** to add another payment row.
   - Set the mode and amount for each.
   - The total of all payments must equal the bill total.
5. To remove a payment row, click the **Remove** button (minimum 1 payment required).

#### Step 8: Complete the Bill

1. Optionally add **Notes** in the text area (e.g., "Customer requested specific stylist next time").
2. Review the **Summary**:
   - Subtotal
   - Discount (displayed in green/red)
   - Total Amount (large, bold)
   - Remaining to Pay (red if > 0)
3. Click **Complete Bill**.

**Validation checks before submission:**
- Customer must be selected.
- Branch must be selected.
- At least 1 item in the cart.
- Total amount must be >= 0.
- Payment total must equal the bill total (within 0.01 tolerance).
- For previous bills, date must be provided.

**On success:**
- A toast notification confirms bill creation.
- The bill number is generated automatically.
- You are redirected to the bills list.
- Dashboard stats and customer data are refreshed automatically.

### Viewing Bill Details

1. From the bills list, click **View** on any bill.
2. The detail page shows:
   - **Header**: Bill number, status badge, date/time.
   - **Customer Info**: Name, Phone, Email (clickable links).
   - **Branch Info**: Branch name.
   - **Created By**: Staff member who created the bill.
   - **Items Table**: Item Name, Type, Qty, Price, Discount %, Subtotal.
   - **Totals**: Subtotal, Item Discounts, Bill Discount (with reason), Total Amount, Amount Paid, Outstanding.
   - **Payments**: Payment mode (with icon), Amount.
   - **Notes**: Any bill notes.

### Printing a Bill

1. Open the bill detail page.
2. Click the **Print** button.
3. The browser's print dialog will open with a formatted receipt layout.

### Bill Statuses

| Status    | Meaning                                        |
|-----------|------------------------------------------------|
| Draft     | Bill is being prepared, not yet finalized      |
| Pending   | Bill is created but payment is incomplete      |
| Completed | Bill is fully paid and finalized               |
| Cancelled | Bill has been cancelled/voided                 |

---

## 11. Inventory & Products

**Prerequisites:**
- Must be logged in as **Owner**, **Developer**, or **Manager**.

The inventory module has three sub-sections accessible from the collapsible **Inventory** menu in the sidebar:
- Products
- Stock Levels
- Stock Transfers

### Products

#### Viewing Products

1. Click **Inventory > Products** in the sidebar.
2. Use the search bar to filter by product name.
3. The table shows:
   - Product Name
   - Brand
   - Category
   - SKU
   - Barcode
   - Cost Price
   - Selling Price
   - Stock (total quantity)
   - Status (Active / Inactive)

#### Adding a Product

1. Click **Add Product**.
2. Fill in:

| Field          | Required | Description                                    |
|----------------|:--------:|------------------------------------------------|
| Product Name   |    Y     | E.g., "Shampoo 500ml", "Hair Gel"              |
| Brand          |    -     | Manufacturer/brand name                        |
| Category       |    -     | Product category                               |
| Barcode        |    -     | Product barcode (unique)                       |
| SKU            |    -     | Stock Keeping Unit (unique)                    |
| MRP            |    -     | Maximum Retail Price                           |
| Selling Price  |    Y     | Your selling price                             |
| Cost Price     |    -     | Your purchase/cost price                       |
| Product Type   |    -     | "Retail" (sold to customers) or "Consumption" (used in salon) |
| Reorder Level  |    -     | Minimum stock before alert (default: 10)       |

3. Click **Create**.

#### Editing a Product

1. Click the **Edit** icon on the product row.
2. Modify fields.
3. Click **Update**.

#### Deleting a Product

1. Click the **Delete** icon on the product row.
2. Confirm deletion.

> **Caution:** Only Owners and Developers can delete products. This action cannot be undone.

### Stock Levels

#### Viewing Stock

1. Click **Inventory > Stock Levels** in the sidebar.
2. Use the **Location** dropdown to filter by inventory location (e.g., "Central Store", "Branch 1 Store").
3. The table shows:
   - Product Name
   - Location
   - Current Stock (quantity)
   - Reorder Level
   - Status (OK / Low Stock)
4. **Low Stock Alerts** section at the top highlights products below reorder level.

#### Adjusting Stock

Use this to correct stock counts manually (e.g., after physical count, damage, wastage).

1. Click the **Adjust Stock** button.
2. Fill in:

| Field           | Required | Description                               |
|-----------------|:--------:|-------------------------------------------|
| Product         |    Y     | Select the product                        |
| Location        |    Y     | Select the inventory location             |
| Quantity        |    Y     | Number of units to add or remove          |
| Adjustment Type |    Y     | Add (increase) or Remove (decrease)       |
| Reason          |    -     | Why the adjustment is being made          |

3. Click **Save**.

#### Creating a Stock Transfer

Transfer stock between locations (e.g., from Central Store to Branch 1).

1. Click the **Stock Transfer** button.
2. Fill in:

| Field         | Required | Description                           |
|---------------|:--------:|---------------------------------------|
| From Location |    Y     | Source inventory location              |
| To Location   |    Y     | Destination inventory location        |

3. Add items to transfer:
   - Click **Add Item**.
   - Select the **Product**.
   - Enter the **Quantity**.
   - Repeat for more items.
   - Click **Remove** (X) to remove an item.
4. Optionally add **Notes**.
5. Click **Create**.

The transfer is created in **Pending** status and requires approval.

### Stock Transfers

#### Viewing Transfers

1. Click **Inventory > Stock Transfers** in the sidebar.
2. Use the **Status** filter: Pending, Completed, Cancelled.
3. The table shows:
   - Transfer ID
   - From Location
   - To Location
   - Items Count
   - Date
   - Status (badge with icon)

#### Approving a Transfer

1. Find a transfer with **Pending** status.
2. Click the **Approve** button.
3. The system will:
   - Deduct stock from the source location.
   - Add stock to the destination location.
   - Update the transfer status to **Completed**.

### Inventory Transaction Types

| Type         | Description                                    |
|--------------|------------------------------------------------|
| Purchase     | New stock purchased from supplier              |
| Sale         | Stock sold to customer (via billing)           |
| Transfer Out | Stock sent to another location                 |
| Transfer In  | Stock received from another location           |
| Adjustment   | Manual stock correction                        |
| Wastage      | Damaged or expired stock                       |
| Return       | Stock returned by customer                     |

---

## 12. Cash Reconciliation

**Prerequisites:**
- Must be logged in as **Owner**, **Developer**, **Manager**, or **Cashier**.

Cash reconciliation ensures that the physical cash in the drawer matches the expected cash from the day's transactions.

### Viewing Daily Cash Summary

1. Click **Cash Drawer** in the sidebar.
2. Select the **Date** (defaults to today).
3. Managers/Owners can select a **Branch**.
4. The summary shows:
   - Expected cash (from the day's cash transactions)
   - Previous day's closing cash
   - Expected total

### Performing Cash Reconciliation

1. Open the Cash Drawer page.
2. Count the physical cash in denominations.
3. Enter the **quantity** for each denomination:

| Denomination | Example: 5 notes of 500 = 2500 |
|--------------|--------------------------------|
| 2000         | Quantity x 2000                |
| 500          | Quantity x 500                 |
| 200          | Quantity x 200                 |
| 100          | Quantity x 100                 |
| 50           | Quantity x 50                  |
| 20           | Quantity x 20                  |
| 10           | Quantity x 10                  |
| 5            | Quantity x 5                   |
| 2            | Quantity x 2                   |
| 1            | Quantity x 1                   |

4. The system calculates the **Total Physical Count** automatically.
5. Click **Reconcile** to open the reconciliation modal.
6. Review:
   - Physical Count vs Expected Amount
   - Difference (surplus or shortage)
   - Status: **Balanced** (match), **Surplus** (excess), or **Shortage** (deficit)
7. Add **Notes** explaining any discrepancies.
8. Click **Submit**.

### Recording a Bank Deposit

When cash is deposited to the bank:

1. Open the Cash Drawer page.
2. Click **Bank Deposit**.
3. Fill in:

| Field            | Required | Description                        |
|------------------|:--------:|------------------------------------|
| Bank Name        |    Y     | Name of the bank                   |
| Account Number   |    Y     | Bank account number                |
| Amount           |    Y     | Amount being deposited             |
| Reference Number |    -     | Transaction/receipt reference      |
| Notes            |    -     | Additional details                 |

4. Click **Submit**.

### Adding Cash Sources

Managers and above can record additional cash sources:

1. Source types: **Counter** (from operations), **Owner** (owner investment), **Family**, **Loan**, **Other**.
2. Enter the amount and description.
3. Click **Submit**.

### Cash History

View past reconciliations and deposits in the **Cash History** table:
- Date
- Type (Reconciliation or Deposit)
- Amount
- Status
- Notes

---

## 13. Reports & Analytics

**Prerequisites:**
- Must be logged in as **Owner**, **Developer**, or **Manager** (Cashiers can only access Daily Sales).

The Reports page has **six report tabs** accessible from the sidebar.

### Daily Sales Report

**Who can access:** Owner, Developer, Manager, Cashier

1. Click **Reports** in the sidebar.
2. Select the **Daily Sales** tab.
3. Choose a **Date** from the date picker.
4. Owners can filter by **Branch**.
5. View:
   - Total sales amount
   - Number of bills
   - Average bill value
   - Chart visualization
6. Export as CSV, Excel, or PDF.

### Monthly Revenue Report

**Who can access:** Owner, Developer, Manager

1. Select the **Monthly Revenue** tab.
2. Choose **Month** and **Year**.
3. Optionally filter by branch.
4. View:
   - Total revenue for the month
   - Comparison with previous month (% change)
   - Revenue breakdown by payment mode (Cash, Card, UPI)
   - Chart visualization

### Customer Analytics

**Who can access:** Owner, Developer, Manager

1. Select the **Customer Analytics** tab.
2. Set the **Period** (number of days to analyze).
3. Optionally filter by branch.
4. View:
   - New customers acquired
   - Returning customers
   - Revenue per customer
   - Top customers table (ranked by spend)

### Employee Performance Report

**Who can access:** Owner, Developer, Manager

1. Select the **Employee Performance** tab.
2. Set the **Period** (number of days).
3. Optionally filter by branch.
4. View:
   - Services completed per employee
   - Stars/loyalty points earned
   - Revenue generated
   - Attendance information
   - Employee ranking table

### Service Analytics

**Who can access:** Owner, Developer, Manager

1. Select the **Service Analytics** tab.
2. Set the **Period**.
3. Optionally filter by branch.
4. View:
   - Most popular services (by volume)
   - Service-wise revenue
   - Average rating per service
   - Service demand chart

### Inventory Report

**Who can access:** Owner, Developer, Manager

1. Select the **Inventory Report** tab.
2. View:
   - Total stock value
   - Low stock items
   - Stock turnover rate
   - Product category breakdown

---

## 14. Settings

**Prerequisites:** Must be logged in as **Owner** or **Developer**.

### Accessing Settings

1. Click **Settings** in the sidebar, or click the gear icon from the avatar dropdown.

### Business Settings

Configure your salon's basic information:

| Setting        | Description                          |
|----------------|--------------------------------------|
| Business Name  | Your salon/business name             |
| Business Phone | Main contact number                  |
| Business Email | Business email address               |
| Business Address | Primary business address           |

### Invoice Settings

Customize how bill numbers are generated:

| Setting              | Description                              |
|----------------------|------------------------------------------|
| Invoice Prefix       | Prefix for bill numbers (e.g., "INV-")   |
| Invoice Number Start | Starting number for invoice sequence     |
| Invoice Format       | Format template for invoice numbers      |

### General Settings

System-wide preferences:

| Setting   | Description                                  |
|-----------|----------------------------------------------|
| Currency  | Currency symbol and code (default: INR)      |
| Date Format | How dates are displayed in the system      |
| Language  | System language                              |

### Branch Feature Toggles

Owners can enable or disable specific features per branch:

1. Select a branch.
2. Toggle features on/off.
3. Changes take effect immediately for all users in that branch.

### Saving and Resetting

- Click **Save** to save modified settings.
- Click **Reset to Defaults** to restore all settings to their original values (requires confirmation).

---

## 15. Troubleshooting & FAQ

### Common Issues

#### Cannot Log In
- **Check credentials:** Use the correct username (not email) and password.
- **Account disabled:** Your account may have been deactivated. Contact the admin/owner.
- **Rate limiting:** In production, login is limited to 5 attempts per 15 minutes. Wait and try again.

#### Page Shows "Loading..." Indefinitely
- **Check backend:** Ensure the backend server is running on port 5001.
- **Check network:** Open browser dev tools (F12) and check the Console/Network tab for errors.
- **Token expired:** Try logging out and back in.

#### Bill Creation Fails
- **"Customer required":** Select a customer before completing the bill.
- **"At least 1 item required":** Add services, packages, or products to the cart.
- **"Payment doesn't match":** Ensure total payments equal the bill total. Use "Set Full Amount" for convenience.
- **Previous bill without date:** When creating a previous bill, date selection is required.

#### Services/Categories Not Showing
- **Branch mismatch:** Categories and services are branch-specific. Ensure you're viewing/selecting the correct branch.
- **Inactive status:** Check if services are set to "Inactive." They won't appear in billing.

#### Low Stock Alert Showing Incorrectly
- **Check reorder level:** The alert triggers when stock falls below the product's reorder level (default: 10). Adjust the reorder level in the product settings.

#### Port Conflicts
If the application won't start due to port conflicts:
```bash
# Kill process on port 5001 (backend)
kill -9 $(lsof -ti:5001)

# Kill process on port 5174 (frontend)
kill -9 $(lsof -ti:5174)
```

### Database Management

#### Open Prisma Studio (Database GUI)
```bash
cd backend
npm run db:studio
```
This opens a web-based database viewer at `http://localhost:5555`.

#### Reset Database
```bash
cd backend
npx prisma migrate reset    # WARNING: Deletes all data
npm run db:seed              # Re-seed default data
```

### API Reference Quick Guide

All API endpoints are prefixed with `/api/v1`. Authentication is via Bearer token in the `Authorization` header.

| Resource   | List          | Create        | Get by ID       | Update          | Delete           |
|------------|---------------|---------------|-----------------|-----------------|------------------|
| Customers  | GET /customers | POST /customers | GET /customers/:id | PUT /customers/:id | -             |
| Bills      | GET /bills    | POST /bills   | GET /bills/:id  | PUT /bills/:id  | DELETE /bills/:id |
| Services   | GET /services | POST /services | GET /services/:id | PUT /services/:id | -             |
| Packages   | GET /packages | POST /packages | GET /packages/:id | PUT /packages/:id | -             |
| Products   | GET /products | POST /products | GET /products/:id | PUT /products/:id | DELETE /products/:id |
| Staff      | GET /users    | POST /users   | GET /users/:id  | PUT /users/:id  | DELETE /users/:id |
| Branches   | GET /branches | POST /branches | GET /branches/:id | PUT /branches/:id | -             |

### Keyboard Shortcuts & Tips

- **Search fields** support real-time filtering as you type.
- **Tables** support pagination using the Previous/Next buttons.
- **Toast notifications** appear in the bottom-right corner and auto-dismiss.
- **Currency** is displayed in Indian Rupees (INR) throughout the system.
- **Dates** are formatted for the Indian locale.

---

## Appendix A: Glossary

| Term               | Definition                                                                |
|--------------------|---------------------------------------------------------------------------|
| Bill               | A transaction record of services/products sold to a customer              |
| Branch             | A physical salon location                                                 |
| Cart               | The collection of items selected for a bill before checkout               |
| Category           | A grouping for services (e.g., "Hair", "Skin") or products               |
| Flat Package       | A package defined by "+" separated service names without linked records   |
| Linked Package     | A package with explicitly linked PackageService records                   |
| Reorder Level      | Minimum stock quantity before a low-stock alert is triggered              |
| Star Points        | Loyalty/performance points assigned to services                           |
| Stock Transfer     | Movement of products between inventory locations                          |
| UPI                | Unified Payments Interface (digital payment method)                       |

## Appendix B: Bill Number Format

Bill numbers are auto-generated using the format:

```
{BranchCode}-{Timestamp}-{Sequence}
```

Example: `SB001-20240115-001`

- **BranchCode**: The branch's unique code (e.g., SB001).
- **Timestamp**: Date in YYYYMMDD format.
- **Sequence**: Incrementing number for that branch on that day.

## Appendix C: Data Validation Rules

| Field                | Rule                                                     |
|----------------------|----------------------------------------------------------|
| Customer Name        | 2-100 characters, required                               |
| Phone Number         | 10 digits                                                |
| Email                | Valid email format                                       |
| Password             | Min 8 characters, must include uppercase, lowercase, digit |
| Bill Discount        | 0-100%                                                   |
| Payment Amount       | Must be positive                                         |
| Product Barcode      | Unique across system                                     |
| Product SKU          | Unique across system                                     |
| Branch Code          | Unique across system                                     |
| Username             | Unique across system                                     |
| Service Price        | Non-negative decimal                                     |
| Package Price        | Must be greater than 0                                   |

---

*This document covers Salon ERP v1.0. For technical support or to report issues, contact your system administrator.*
