# Salon ERP - Frontend

React frontend for the Salon ERP multi-branch salon management system.

> **Backend repo**: The backend (Express.js + Prisma + PostgreSQL) lives in a separate repo at `salon-erp-be/`.

## Technology Stack

- React 18 + Vite
- shadcn/ui + Tailwind CSS
- Redux Toolkit + TanStack Query
- React Hook Form + Zod validation
- React Router v6

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- Backend API running on port 5001 (see `salon-erp-be` repo)

### Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Create .env with:
   VITE_API_BASE_URL=http://localhost:5001/api/v1
   ```

3. **Start the dev server:**
   ```bash
   npm run dev    # Starts on port 5174
   ```

4. **Access the application:**
   - Frontend: http://localhost:5174
   - Backend API: http://localhost:5001

### Default Login Credentials

| Username | Password | Role |
|----------|----------|------|
| owner | Password123! | Owner |
| manager1 | Password123! | Manager (Branch 1) |
| cashier1 | Password123! | Cashier (Branch 1) |
| employee1 | Password123! | Employee (Branch 1) |

## Project Structure

```
salon-erp/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout/       # Sidebar, Header
│   │   └── auth/         # Protected routes
│   ├── pages/            # Route pages
│   │   └── dashboards/   # Role-based dashboards
│   ├── services/         # API client
│   ├── store/            # Redux slices
│   ├── lib/              # Utilities
│   └── styles/           # Global CSS
├── public/
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## User Roles

| Role | Access Level |
|------|--------------|
| Owner | All branches, full system access |
| Developer | All branches, technical admin |
| Manager | Single branch, staff & operations |
| Cashier | Single branch, billing & customers |
| Employee | Own performance & attendance |
| Vendor | Products & inventory view |

## Building for Production

```bash
VITE_API_BASE_URL=https://your-api-domain.com/api/v1 npm run build
```

The production build is output to `dist/`. Serve with any static file server:
```bash
npx serve -s dist -l 5174
```

## Deployment

See `vercel.json` for Vercel deployment configuration.

## License

Proprietary - All rights reserved
