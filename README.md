# Salon ERP System

A multi-branch salon ERP system with modern, clean UI supporting 6 user roles, comprehensive billing, inventory management, and analytics.

## Technology Stack

### Frontend
- React 18 + Vite
- shadcn/ui + Tailwind CSS
- Redux Toolkit + TanStack Query
- React Hook Form + Zod validation
- React Router v6

### Backend
- Node.js 20 LTS + Express.js
- Prisma ORM with PostgreSQL
- JWT Authentication
- Zod validation
- Socket.io for real-time

### Database
- PostgreSQL 16
- Redis for caching

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- Docker and Docker Compose
- npm or yarn

### Development Setup

1. **Start the database services:**
   ```bash
   docker-compose up -d
   ```

2. **Set up the backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env  # or use existing .env
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   npm run dev
   ```

3. **Set up the frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001
   - API Health Check: http://localhost:5001/health

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
├── backend/
│   ├── src/
│   │   ├── config/           # Database, Redis, JWT config
│   │   ├── controllers/      # Route handlers
│   │   ├── middleware/       # Auth, RBAC, error handling
│   │   ├── routes/           # API route definitions
│   │   ├── services/         # Business logic
│   │   ├── validators/       # Request validation schemas
│   │   ├── utils/            # Helpers, logger
│   │   ├── app.js           # Express app setup
│   │   └── server.js        # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema (36+ tables)
│   │   └── seed.js           # Database seeding
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components
│   │   │   ├── layout/       # Sidebar, Header
│   │   │   └── auth/         # Protected routes
│   │   ├── pages/            # Route pages
│   │   │   └── dashboards/   # Role-based dashboards
│   │   ├── services/         # API client
│   │   ├── store/            # Redux slices
│   │   ├── lib/              # Utilities
│   │   └── styles/           # Global CSS
│   ├── tailwind.config.js
│   └── package.json
│
├── docker-compose.yml        # PostgreSQL + Redis
└── README.md
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

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Current user

### Core Modules
- `/api/v1/customers` - Customer management
- `/api/v1/bills` - Billing operations
- `/api/v1/services` - Service catalog
- `/api/v1/packages` - Package bundles
- `/api/v1/branches` - Branch management

## Features Implemented

### Phase 1 (Foundation)
- [x] Docker Compose setup (PostgreSQL + Redis)
- [x] Backend with Express + Prisma
- [x] Full database schema (36+ tables)
- [x] JWT authentication system
- [x] Role-based access control
- [x] Frontend with React + Tailwind + shadcn/ui
- [x] Login page
- [x] Role-based dashboards (Owner, Manager, Cashier, Employee)
- [x] Layout components (Sidebar, Header)
- [x] Customer list page
- [x] Bills list page
- [x] Services list page

### Coming Soon
- [ ] Bill creation POS interface
- [ ] Bill import (CSV/Excel)
- [ ] Inventory management
- [ ] Reports & analytics
- [ ] Real-time notifications

## Deployment

### Docker Compose (Full Stack)

Deploy all services (PostgreSQL, Redis, backend, frontend) with a single command:

1. **Clone the repository and navigate to the project root:**
   ```bash
   cd salon-erp
   ```

2. **Configure environment variables for production:**

   Update `docker-compose.yml` or create a `docker-compose.override.yml` with production values:
   - Change `POSTGRES_PASSWORD` to a strong password
   - Set `JWT_SECRET` and `JWT_REFRESH_SECRET` to secure random strings
   - Set `NODE_ENV` to `production`
   - Update `CORS_ORIGIN` to your production frontend URL
   - Update `VITE_API_BASE_URL` to your production backend URL

3. **Start all services:**
   ```bash
   docker-compose up -d --build
   ```
   This will:
   - Start PostgreSQL 16 and Redis 7
   - Build and start the backend (runs migrations and seeds automatically)
   - Build and start the frontend

4. **Verify the deployment:**
   ```bash
   docker-compose ps
   ```
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5001
   - Health Check: http://localhost:5001/health

5. **View logs:**
   ```bash
   docker-compose logs -f           # All services
   docker-compose logs -f backend   # Backend only
   docker-compose logs -f frontend  # Frontend only
   ```

### Manual Deployment (Without Docker)

#### Prerequisites
- Node.js 20.x LTS
- PostgreSQL 16
- Redis 7

#### Backend

1. **Install dependencies and configure:**
   ```bash
   cd backend
   npm ci --production
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with production values:
   ```
   NODE_ENV=production
   PORT=5001
   DATABASE_URL=postgresql://<user>:<password>@<host>:5432/salon_erp?schema=public
   REDIS_HOST=<redis-host>
   REDIS_PORT=6379
   JWT_SECRET=<secure-random-string>
   JWT_REFRESH_SECRET=<secure-random-string>
   CORS_ORIGIN=https://your-domain.com
   ```

3. **Run database migrations and seed:**
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

#### Frontend

1. **Install dependencies and build:**
   ```bash
   cd frontend
   VITE_API_BASE_URL=https://your-api-domain.com/api/v1 npm run build
   ```

2. **Serve the built files:**

   The production build is output to `frontend/dist/`. Serve it with any static file server (e.g., Nginx, Caddy, or `npx serve`):
   ```bash
   npx serve -s dist -l 5173
   ```

### Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (`development` / `production`) | `development` |
| `PORT` | Backend server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | (see `.env.example`) |
| `REDIS_HOST` | Redis server hostname | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password (if set) | (empty) |
| `JWT_SECRET` | Secret key for JWT access tokens | (change in production) |
| `JWT_REFRESH_SECRET` | Secret key for JWT refresh tokens | (change in production) |
| `JWT_EXPIRES_IN` | Access token expiry | `1h` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry | `30d` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `MAX_FILE_SIZE` | Max upload file size in bytes | `10485760` (10MB) |
| `UPLOAD_DIR` | File upload directory | `./uploads` |
| `LOG_LEVEL` | Logging level | `info` |
| `VITE_API_BASE_URL` | Frontend API base URL | `http://localhost:5001/api/v1` |

### Useful Commands

```bash
# Stop all services
docker-compose down

# Stop and remove all data (volumes)
docker-compose down -v

# Rebuild a specific service
docker-compose up -d --build backend

# Run database migrations manually
docker-compose exec backend npx prisma migrate deploy

# Open Prisma Studio (database GUI)
cd backend && npx prisma studio

# Run tests
cd backend && npm test
```

## License

Proprietary - All rights reserved
