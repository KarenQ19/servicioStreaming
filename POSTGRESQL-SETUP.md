# 🐘 Configuración de PostgreSQL 18 para Windows

## ✅ Verificar instalación de PostgreSQL

```powershell
# Verificar que psql está disponible
psql --version

# Si no sale la versión, PostgreSQL no está en el PATH
# Ver sección de Troubleshooting al final
```

## 🗄️ Crear Base de Datos (Opción Recomendada: Manual)

### Paso 1: Conectarse a PostgreSQL

```powershell
# Conectar con usuario postgres (contraseña configurada en instalación)
psql -U postgres -h localhost

# Si pide contraseña, ingresarla
```

### Paso 2: Ejecutar SQL

Dentro del prompt de psql (verás `postgres=#`), ejecuta:

```sql
-- 1. Crear base de datos
CREATE DATABASE streaming_service_db;

-- 2. Crear usuario con contraseña
CREATE USER streaming_user WITH PASSWORD 'streaming_pass_123';

-- 3. Configurar propiedades del usuario
ALTER ROLE streaming_user SET client_encoding TO 'utf8';
ALTER ROLE streaming_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE streaming_user SET default_transaction_deferrable TO on;
ALTER ROLE streaming_user SET default_time_zone TO 'UTC';

-- 4. Asignar privilegios a la base de datos
GRANT ALL PRIVILEGES ON DATABASE streaming_service_db TO streaming_user;

-- 5. Conectarse a la BD (cambiar contexto)
\c streaming_service_db

-- 6. Asignar permisos del esquema
GRANT SCHEMA public TO streaming_user;

-- 7. Salir
\q
```

### Verificación

```powershell
# Conectar como el nuevo usuario
psql -U streaming_user -h localhost -d streaming_service_db

# Debería pedir contraseña: streaming_pass_123
# Si entra exitosamente, verás: streaming_service_db=>
```

---

## 🔧 Comandos de Gestión PostgreSQL (Windows)

### Ver versión
```powershell
psql --version
```

### Conectar a PostgreSQL
```powershell
# Con usuario postgres
psql -U postgres

# Con otro usuario
psql -U streaming_user -d streaming_service_db
```

### Dentro de psql

```sql
-- Listar bases de datos
\l

-- Listar usuarios
\du

-- Conectarse a una BD
\c nombre_base_datos

-- Listar tablas
\dt

-- Listar esquemas
\dn

-- Ver estructura de una tabla
\d nombre_tabla

-- Ejecutar archivo SQL
\i 'ruta/al/archivo.sql'

-- Salir
\q
```

### Reiniciar servicio de PostgreSQL

```powershell
# Como Administrador

# Opción 1: Usar net (CMD)
net stop postgresql-x64-18
net start postgresql-x64-18

# Opción 2: Usar powershell
Restart-Service postgresql-x64-18

# Opción 3: Servicios de Windows
# Buscar: servicios
# Encontrar: postgresql-x64-18
# Click derecho > Reiniciar
```

---

## 🔑 Reset de Contraseña (Si olvidas la de postgres)

### Opción 1: Editar pg_hba.conf

```powershell
# 1. Abrir archivo de configuración
# Ruta típica: C:\Program Files\PostgreSQL\18\data\pg_hba.conf
# Usar: Bloc de notas

# 2. Buscar línea: local   all             all                                     md5
# 3. Cambiar md5 a trust:
#    local   all             all                                     trust

# 4. Guardar y reiniciar PostgreSQL
Restart-Service postgresql-x64-18

# 5. Conectarse sin contraseña
psql -U postgres

# 6. Dentro de psql, cambiar contraseña
ALTER USER postgres WITH PASSWORD 'nueva_contraseña';

# 7. Volver a cambiar pg_hba.conf: trust -> md5
# 8. Reiniciar PostgreSQL nuevamente
```

---

## 📊 Verificar Estado de la Base de Datos

Después de correr `npx prisma migrate dev`:

```powershell
# Conectar a la BD
psql -U streaming_user -d streaming_service_db

# Ver todas las tablas
\dt

# Contar registros por tabla (ejemplo)
SELECT 'clientes' as tabla, COUNT(*) FROM clientes UNION
SELECT 'servicios', COUNT(*) FROM servicios UNION
SELECT 'administradores', COUNT(*) FROM administradores;

# Ver estructura de una tabla
\d clientes
```

---

## 🗑️ Limpiar/Rescan BD (Si hay errores)

```powershell
cd backend

# Opción 1: Reset completo (borra todo y recrea)
npx prisma migrate reset

# Opción 2: Solo deshacer última migración
npx prisma migrate resolve --rolled-back nombre_migracion

# Opción 3: Recrear BD manualmente
# 1. Conectar a postgres
psql -U postgres

# 2. Dentro de psql:
DROP DATABASE IF EXISTS streaming_service_db;
CREATE DATABASE streaming_service_db;
GRANT ALL PRIVILEGES ON DATABASE streaming_service_db TO streaming_user;
\c streaming_service_db
GRANT SCHEMA public TO streaming_user;
\q

# 3. Volver a crear tablas
npx prisma migrate dev
```

---

## 📝 Variables de Conexión

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| Host | `localhost` | Servidor PostgreSQL |
| Puerto | `5432` | Puerto por defecto de PostgreSQL |
| Usuario | `streaming_user` | Usuario creado |
| Contraseña | `streaming_pass_123` | Contraseña del usuario |
| Base de datos | `streaming_service_db` | Base de datos principal |
| SSL | `false` | No usar SSL en desarrollo |

---

## 🐛 Troubleshooting PostgreSQL

### ❌ Error: "psql command not found"

```powershell
# Agregar PostgreSQL al PATH

# 1. Copiar la ruta de instalación
# C:\Program Files\PostgreSQL\18\bin

# 2. Abrir Variables de entorno
# Windows + X > Sistema > Configuración avanzada > Variables de entorno

# 3. Agregar ruta al PATH del sistema

# 4. Reiniciar PowerShell

# 5. Verificar
psql --version
```

### ❌ Error: "FATAL: Ident authentication failed for user"

```sql
-- Cambiar método de autenticación en pg_hba.conf
-- Buscar línea: local   all   all   ident
-- Cambiar a: local   all   all   trust o md5
```

### ❌ Error: "FATAL: password authentication failed"

```powershell
# Opción 1: Verificar contraseña
# Asegúrate de usar: streaming_pass_123

# Opción 2: Reset de contraseña (ver sección anterior)

# Opción 3: Cambiar en .env a usuario postgres
DATABASE_URL=postgresql://postgres:contraseña_postgres@localhost:5432/streaming_service_db
```

### ❌ Error: "Connection refused"

```powershell
# 1. Verificar que PostgreSQL está corriendo
Get-Service postgresql-x64-18 | Select-Object Status

# 2. Si está detenido, iniciar
Start-Service postgresql-x64-18

# 3. Si el servicio no existe, PostgreSQL no está instalado correctamente
```

### ❌ Error: "Database already exists"

```sql
-- Opción 1: Usar BD existente, cambiar en .env

-- Opción 2: Borrar BD e intentar de nuevo
DROP DATABASE streaming_service_db;
CREATE DATABASE streaming_service_db;
GRANT ALL PRIVILEGES ON DATABASE streaming_service_db TO streaming_user;
```

---

## ✨ Tips

1. **Backup**: Antes de cambios grandes, hacer backup
   ```powershell
   pg_dump -U streaming_user -d streaming_service_db > backup.sql
   ```

2. **Restore**: Si algo falla
   ```powershell
   psql -U streaming_user -d streaming_service_db < backup.sql
   ```

3. **Vacío de datos rápido** (sin borrar tablas)
   ```sql
   TRUNCATE TABLE clientes, servicios, pagos, suscripciones CASCADE;
   ```

4. **Ver queries ejecutadas**:
   - En `backend/.env`, agregar:
     ```
     DATABASE_LOG=query
     ```

---

**¿Listo? Continúa con: `npx prisma migrate dev`** 🚀
