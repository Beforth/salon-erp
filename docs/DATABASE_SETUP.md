# Database Setup Guide

## 1. Clear All Seed/Demo Data

Run the following SQL against your PostgreSQL database to remove all seed data. The order respects foreign key constraints.

```sql
-- ============================================
-- CLEAR ALL DATA (respects FK constraints)
-- ============================================

-- Audit & sessions
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE user_sessions CASCADE;

-- Billing
TRUNCATE TABLE bill_item_employees CASCADE;
TRUNCATE TABLE payments CASCADE;
TRUNCATE TABLE bill_items CASCADE;
TRUNCATE TABLE bills CASCADE;
TRUNCATE TABLE bill_import_logs CASCADE;

-- Packages & redemptions
TRUNCATE TABLE package_redemptions CASCADE;
TRUNCATE TABLE customer_packages CASCADE;
TRUNCATE TABLE package_services CASCADE;
TRUNCATE TABLE packages CASCADE;

-- Inventory & stock
TRUNCATE TABLE stock_transfer_items CASCADE;
TRUNCATE TABLE stock_transfers CASCADE;
TRUNCATE TABLE inventory_transactions CASCADE;
TRUNCATE TABLE inventory CASCADE;
TRUNCATE TABLE products CASCADE;
TRUNCATE TABLE product_categories CASCADE;
TRUNCATE TABLE inventory_locations CASCADE;

-- Services
TRUNCATE TABLE services CASCADE;
TRUNCATE TABLE service_categories CASCADE;

-- Customers
TRUNCATE TABLE customers CASCADE;

-- Finance
TRUNCATE TABLE bank_deposits CASCADE;
TRUNCATE TABLE cash_sources CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE expense_categories CASCADE;
TRUNCATE TABLE assets CASCADE;

-- Employees & attendance
TRUNCATE TABLE leave_requests CASCADE;
TRUNCATE TABLE employee_performance CASCADE;
TRUNCATE TABLE attendance CASCADE;
TRUNCATE TABLE employee_details CASCADE;
TRUNCATE TABLE waiting_list CASCADE;
TRUNCATE TABLE chairs CASCADE;

-- Features
TRUNCATE TABLE branch_features CASCADE;
TRUNCATE TABLE features CASCADE;

-- Settings
TRUNCATE TABLE system_settings CASCADE;

-- Users & branches (last, since many tables reference these)
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE branches CASCADE;
```

### Running the SQL

**Option A: Via psql**
```bash
psql -U your_db_user -d salon_erp -f docs/clear_data.sql
```

**Option B: Via Prisma Studio**
```bash
cd backend
npx prisma studio
```
Then manually delete records from each table.

**Option C: Via Prisma Reset (drops and recreates all tables)**
```bash
cd backend
npx prisma migrate reset
```
> Note: `migrate reset` drops the entire database, re-runs all migrations, and re-runs the seed script. Skip the seed by using `--skip-seed`.

```bash
npx prisma migrate reset --skip-seed
```

---

## 2. Create the First Owner User

After clearing data, you need at least one owner user and one branch to get started.

### Option A: Use the provided script

```bash
cd backend
node scripts/create-owner.js
```

The script will prompt-free create an owner with the credentials you configure in the environment or defaults:
- **Username**: `owner`
- **Password**: `Owner@123`
- **Email**: `owner@salon.com`

You can customize by passing environment variables:
```bash
OWNER_USERNAME=admin OWNER_PASSWORD=MySecure@456 OWNER_EMAIL=admin@mysalon.com node scripts/create-owner.js
```

### Option B: Direct SQL

Replace `YOUR_PASSWORD_HASH` with a bcrypt hash of your desired password. You can generate one at https://bcrypt-generator.com/ or via Node.js:

```bash
node -e "require('bcryptjs').hash('Owner@123', 10).then(h => console.log(h))"
```

Then run:

```sql
-- Step 1: Create a branch
INSERT INTO branches (id, name, code, address, phone, city, state, pincode, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Main Branch',
  'MB001',
  'Your branch address',
  '9876543210',
  'Your City',
  'Your State',
  '411001',
  true,
  NOW(),
  NOW()
);

-- Step 2: Create the owner user (branch_id is NULL for owners — they can access all branches)
INSERT INTO users (id, username, email, password_hash, full_name, phone, role, branch_id, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'owner',
  'owner@yoursalon.com',
  '$2a$12$prtms4ApAsDbgeF/wcPffu8AWamQXzDIZpTh9SIIdIRXCjMibqOTu',
  'Salon Owner',
  '9876543210',
  'owner',
  NULL,
  true,
  NOW(),
  NOW()
);
```

### Option C: Via the application

1. Run the create-owner script (Option A) to bootstrap the first owner
2. Log in as the owner
3. Use the Staff Management page to create managers, cashiers, and employees
4. Use the Branch Management page to create additional branches

---

## 3. Essential Setup After First Login

After creating the owner and logging in:

1. **Branches**: Go to Branch Management and create/edit your branches
2. **Service Categories**: Create categories (e.g., Hair, Beard, Face, Spa)
3. **Services**: Add your services under each category with pricing
4. **Packages**: Create packages bundling services together
5. **Staff**: Add managers, cashiers, and employees, assigning them to branches
6. **Products** (optional): Add retail/consumption products
7. **Expense Categories** (optional): Set up categories for expense tracking
