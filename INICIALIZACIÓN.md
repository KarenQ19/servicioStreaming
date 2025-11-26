# 🎬 Servicio de Streaming - Guía de Inicialización

## 📋 Requisitos Previos

- **Node.js**: v18+ (recomendado v20)
- **PostgreSQL**: v18
- **npm**: v9+
- **Git**: (opcional, para clonar el repositorio)

---

## 🚀 Inicialización Rápida

### Opción 1: Automatizada (Windows PowerShell)

```powershell
# 1. Ejecutar script de inicialización
.\init-database.ps1

# 2. El script creará:
# ✓ Base de datos: streaming_service_db
# ✓ Usuario: streaming_user
# ✓ Contraseña: streaming_pass_123
```

### Opción 2: Manual (Todos los sistemas)

#### Paso 1: Crear la Base de Datos

```powershell
# Conectarse a PostgreSQL con el usuario postgres
psql -U postgres

# Dentro del prompt de psql, ejecutar:
```

```sql
-- Crear la base de datos
CREATE DATABASE streaming_service_db;

-- Crear usuario con contraseña
CREATE USER streaming_user WITH PASSWORD 'streaming_pass_123';

-- Configurar permisos de usuario
ALTER ROLE streaming_user SET client_encoding TO 'utf8';
ALTER ROLE streaming_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE streaming_user SET default_transaction_deferrable TO on;
ALTER ROLE streaming_user SET default_time_zone TO 'UTC';

-- Asignar privilegios a la base de datos
GRANT ALL PRIVILEGES ON DATABASE streaming_service_db TO streaming_user;

-- Conectarse a la base de datos
\c streaming_service_db

-- Asignar permisos del esquema
GRANT SCHEMA public TO streaming_user;

-- Salir
\q
```

#### Paso 2: Configurar Variables de Entorno

**Backend (`backend/.env`)**

```dotenv
# CONFIGURACIÓN DEL SERVIDOR
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
SESSION_SECRET=tu-secreto-de-sesion-seguro-cambiar-en-produccion
API_PREFIX=/api/v1

# CONEXIÓN A BASE DE DATOS
DATABASE_URL=postgresql://streaming_user:streaming_pass_123@localhost:5432/streaming_service_db

# AUTENTICACIÓN JWT
JWT_SECRET=tu-secreto-jwt-cambiar-en-produccion
JWT_EXPIRATION=7d

# REDES SOCIALES (Dejar vacío si no se usa en desarrollo)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

**Frontend (`frontend/.env`)**

```dotenv
# URL DE LA API
VITE_API_URL=http://localhost:3000/api/v1

# CONFIGURACIÓN DE LA APP
VITE_NODE_ENV=development
VITE_APP_NAME=Servicio de Streaming
VITE_APP_VERSION=1.0.0
```

#### Paso 3: Instalar Dependencias

```powershell
# Backend
cd backend
npm install

# Frontend (en otra terminal/tab)
cd frontend
npm install

# Volver a la raíz
cd ..
```

#### Paso 4: Inicializar Prisma y Migrar BD

```powershell
cd backend

# Generar cliente de Prisma
npx prisma generate

# Ejecutar migraciones (crea las tablas)
npx prisma migrate dev

# Sembrar datos iniciales (usuarios, servicios, métodos de pago)
npx prisma db seed

cd ..
```

#### Paso 5: Verificar la BD (Opcional)

```powershell
cd backend

# Abrir Prisma Studio (interfaz web para ver/editar datos)
npx prisma studio

# La interfaz abrirá en http://localhost:5555
```

#### Paso 6: Iniciar los Servidores

```powershell
# Terminal 1: Backend
cd backend
npm run dev
# Debería mostrar: 🚀 Server running on port 3000

# Terminal 2: Frontend
cd frontend
npm run dev
# Debería mostrar: VITE v5.x ready in x ms
# Local: http://localhost:5173
```

---

## 🔗 URLs de Acceso

| Componente | URL | Descripción |
|-----------|-----|-------------|
| **Frontend** | http://localhost:5173 | Aplicación React |
| **Backend - API** | http://localhost:3000/api/v1 | API REST |
| **Backend - Health** | http://localhost:3000/health | Verificar estado del servidor |
| **Prisma Studio** | http://localhost:5555 | Gestor de BD visual |

---

## 👤 Usuarios de Prueba

Después de ejecutar el seed (`npx prisma db seed`), disponibles:

### Cliente
- **Email**: `cliente@test.com`
- **Contraseña**: `cliente123`

### Administrador
- **Email**: `admin@gmail.com`
- **Contraseña**: `admin123`

---

## 📊 Estructura de la Base de Datos

### Tablas Principales

- **clientes**: Usuarios que se suscriben a servicios
- **administradores**: Administradores que crean y gestionan servicios
- **servicios**: Servicios de streaming disponibles (Netflix, Spotify, etc.)
- **suscripciones**: Relación cliente-servicio con fecha de expiración
- **pagos**: Registro de pagos realizados
- **carritos**: Carrito de compra temporal
- **carrito_items**: Items en el carrito
- **credenciales**: Credenciales compartidas para acceder a servicios
- **metodos_pago**: Métodos de pago disponibles (Tarjeta, QR, Transferencia, etc.)
- **qr_codes**: Códigos QR para pago
- **validaciones_ocr**: Historial de validación OCR de comprobantes

---

## 🛠️ Comandos Útiles

### Backend

```powershell
cd backend

# Desarrollo con hot-reload
npm run dev

# Build para producción
npm run build

# Ejecutar aplicación compilada
npm start

# Migrar base de datos
npx prisma migrate dev --name <nombre_migracion>

# Deshacer última migración
npx prisma migrate resolve --rolled-back <nombre_migracion>

# Generar esquema SQL
npx prisma db execute --stdin < schema.sql

# Visualizar DB con interfaz gráfica
npx prisma studio

# Lint (revisar código)
npm run lint

# Lint + fix automático
npm run lint:fix

# Formatear código
npm run format

# Sembrar datos iniciales
npx prisma db seed
```

### Frontend

```powershell
cd frontend

# Desarrollo con hot-reload
npm run dev

# Build para producción
npm run build

# Preview de la build
npm run preview

# Lint (revisar código)
npm run lint
```

---

## 🐛 Troubleshooting

### ❌ Error: "psql: command not found"
- **Solución**: Agregar PostgreSQL al PATH de Windows
  1. Ir a: `C:\Program Files\PostgreSQL\18\bin`
  2. Copiar la ruta
  3. Agregar al PATH del sistema (Variables de entorno)

### ❌ Error: "password authentication failed for user 'postgres'"
- **Solución**: Usar la contraseña correcta de PostgreSQL o resetear:
  ```powershell
  # Editar: C:\Program Files\PostgreSQL\18\data\pg_hba.conf
  # Cambiar 'md5' a 'trust' en la línea local
  # Luego reiniciar PostgreSQL
  ```

### ❌ Error: "ENOENT: no such file or directory"
- **Solución**: Asegurar que estás en la carpeta correcta
  ```powershell
  # Verifica:
  pwd  # Debería ser servicioStreaming/backend o /frontend
  ```

### ❌ Error: "Cannot find module '@prisma/client'"
- **Solución**: 
  ```powershell
  npm install
  npx prisma generate
  ```

### ❌ Error: "Port 3000 already in use"
- **Solución**: Cambiar el puerto en `backend/.env`
  ```dotenv
  PORT=3001
  ```

### ❌ Error: "Connection refused" a PostgreSQL
- **Solución**: Verificar que PostgreSQL esté corriendo
  ```powershell
  # Windows
  # Ir a: Servicios > PostgreSQL > Iniciar
  
  # O desde PowerShell (Admin):
  Start-Service postgresql-x64-18
  ```

---

## 📁 Estructura de Carpetas

```
servicioStreaming/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Definición de modelos
│   │   ├── seed.ts            # Datos iniciales
│   │   └── migrations/         # Historial de cambios en BD
│   ├── src/
│   │   ├── app.ts             # Configuración de Express
│   │   ├── server.ts          # Punto de entrada
│   │   ├── controllers/       # Lógica de negocio
│   │   ├── services/          # Servicios (OCR, etc)
│   │   ├── routes/            # Definición de rutas API
│   │   ├── middleware/        # Middleware personalizado
│   │   ├── utils/             # Utilidades (BD, etc)
│   │   ├── config/            # Configuraciones (Passport)
│   │   └── types/             # Tipos TypeScript
│   ├── .env                   # Variables de entorno
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # Componente raíz
│   │   ├── main.tsx           # Punto de entrada
│   │   ├── components/        # Componentes React
│   │   ├── pages/             # Páginas/Rutas
│   │   ├── context/           # Context API (Auth, etc)
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # Servicios (API calls)
│   │   ├── types/             # Tipos TypeScript
│   │   ├── utils/             # Utilidades
│   │   └── styles/            # Estilos
│   ├── .env                   # Variables de entorno
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── .github/
│   └── copilot-instructions.md  # Instrucciones para IA
│
└── README.md
```

---

## 📚 Documentación Adicional

- [Prisma Documentation](https://www.prisma.io/docs/)
- [Express.js Documentation](https://expressjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [PostgreSQL 18 Documentation](https://www.postgresql.org/docs/18/)

---

## 💡 Tips de Desarrollo

1. **Variables de entorno**: Nunca commitear archivos `.env` a Git
2. **Migraciones**: Siempre crear descriptivas con `npx prisma migrate dev --name nombre_descriptivo`
3. **Seeders**: Mantener actualizado `prisma/seed.ts` con datos de prueba
4. **Control de versiones**: Ignorar `node_modules/`, `dist/`, `.env` en `.gitignore`

---

**¡Listo! Ya puedes comenzar a desarrollar. Si tienes problemas, consulta la sección de Troubleshooting.** 🎉
