# 🎬 Instrucciones para Agentes de IA - Servicio de Streaming

## 📋 Descripción General del Proyecto

Plataforma de streaming full-stack con autenticación OAuth, gestión de pagos (QR/Transferencia), validación OCR de comprobantes, y suscripciones a servicios. 

**Stack**: Node.js/TypeScript + React + PostgreSQL + Prisma

## 🏗️ Arquitectura

### Backend (`backend/`)
- **Runtime**: Node.js + TypeScript + Express
- **Autenticación**: Passport.js (Local + OAuth Google/Facebook)
- **BD**: Prisma ORM + PostgreSQL 18
- **Punto de entrada**: `src/app.ts` (Express setup) y `src/server.ts` (Start server)
- **Rutas API**: `/api/v1/*` (configurable via `API_PREFIX`)
- **Estructura**:
  - `src/controllers/`: Lógica de negocio (auth, pagos, suscripciones, etc)
  - `src/services/`: Servicios (OCRService, etc)
  - `src/routes/`: Definición de endpoints
  - `src/middleware/`: Autenticación, validación, errores
  - `src/utils/database.ts`: Cliente Prisma singleton
  - `prisma/schema.prisma`: Modelos de BD
  - `prisma/seed.ts`: Datos iniciales (admin, usuario test, servicios)
  - `prisma/migrations/`: Historial de cambios en BD

### Frontend (`frontend/`)
- **Runtime**: React 19 + TypeScript + Vite
- **Estilado**: TailwindCSS
- **Gestión de estado**: React Context (AuthContext)
- **Punto de entrada**: `src/main.tsx` y `src/App.tsx`
- **Estructura**:
  - `src/context/AuthContext.tsx`: Gestión global de autenticación y usuario
  - `src/services/authService.ts`: Llamadas API de auth
  - `src/components/`: Componentes reutilizables
  - `src/pages/`: Páginas (Login, Dashboard, Admin, etc)
  - `src/utils/testLogin.ts`: Login programático para testing

## Initialization & Setup

### 1. PostgreSQL Database Setup (Windows with PostgreSQL 18)
**Create database and user:**
```powershell
# Connect to PostgreSQL (replace USER with your postgres user)
psql -U postgres

# Inside psql:
CREATE DATABASE streaming_service_db;
CREATE USER streaming_user WITH PASSWORD 'streaming_pass_123';
ALTER ROLE streaming_user SET client_encoding TO 'utf8';
ALTER ROLE streaming_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE streaming_user SET default_transaction_deferrable TO on;
ALTER ROLE streaming_user SET default_time_zone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE streaming_service_db TO streaming_user;
\c streaming_service_db
GRANT SCHEMA public TO streaming_user;
```

### 2. Environment Variables
Files already created at `backend/.env` and `frontend/.env`. Edit them with your values:

**backend/.env** (Key variables)
```
DATABASE_URL=postgresql://streaming_user:streaming_pass_123@localhost:5432/streaming_service_db
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=tu-secreto-de-sesion-seguro
```

**frontend/.env**
```
VITE_API_URL=http://localhost:3000/api/v1
VITE_NODE_ENV=development
```

### 3. Install Dependencies
```powershell
cd backend
npm install
cd ../frontend
npm install
cd ..
```

### 4. Initialize Prisma & Database
```powershell
cd backend
npx prisma migrate dev --name init
npx prisma db seed
cd ..
```

### 5. Verify Database (Optional)
```powershell
cd backend
npx prisma studio
cd ..
```

### 6. Start Development Servers
Open two terminals:
```powershell
# Terminal 1: Backend
cd backend
npm run dev
# Runs on http://localhost:3000/health

# Terminal 2: Frontend  
cd frontend
npm run dev
# Runs on http://localhost:5173
```

## Developer Workflows
- **Testing**: Custom test scripts in `backend/` (e.g., `test-payment-system.js`, `test-multiple-users.ts`). Run with `node` or `ts-node`.
- **Lint/Format**: Use `npm run lint` and `npm run format` in backend; `npm run lint` in frontend.
- **Build**: Backend: `npm run build`; Frontend: `npm run build`

## Patterns & Conventions
- **API Prefix**: All backend routes are under `/api/v1` (configurable via `API_PREFIX`)
- **Auth**: JWT tokens stored in localStorage (frontend), Passport.js (backend)
- **Database**: Prisma ORM, single client instance (`src/utils/database.ts`)
- **OCR**: Service pattern, testable via scripts
- **Frontend**: Uses React Context for auth, Tailwind for styling, Vite for build/dev

## Integration Points
- **Frontend <-> Backend**: API calls to `VITE_API_URL` (default: `http://localhost:3000/api/v1`)
- **Database**: PostgreSQL, managed via Prisma
- **OCR**: Backend service, exposed via API endpoints

## Example Test User
- Email: `cliente@test.com`
- Password: `password123`

## References
- Key backend files: `src/app.ts`, `src/server.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, `src/config/passport.ts`
- Key frontend files: `src/App.tsx`, `src/context/AuthContext.tsx`, `src/utils/testLogin.ts`, `src/components/Admin/AdminSettings.tsx`

---
**Update this file if you change environment variables, database config, or major workflows.**
