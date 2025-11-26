# 🚀 GUÍA RÁPIDA DE INICIALIZACIÓN

## ⏱️ Tiempo estimado: 10-15 minutos

---

## 📋 CHECKLIST PREVIO

- [ ] PostgreSQL 18 instalado y funcionando
- [ ] Node.js v18+ instalado
- [ ] npm v9+ instalado
- [ ] Estar en la carpeta raíz: `servicioStreaming/`

---

## 🎯 PASO 1: Crear Base de Datos en PostgreSQL

### Opción A: Script Automatizado (⚡ Recomendado)
```powershell
.\init-database.ps1
```
✅ El script crea todo automáticamente

### Opción B: Manual (Si el script falla)
```powershell
psql -U postgres

# Dentro de psql, copiar y pegar TODO:
```

```sql
CREATE DATABASE streaming_service_db;
CREATE USER streaming_user WITH PASSWORD 'streaming_pass_123';
ALTER ROLE streaming_user SET client_encoding TO 'utf8';
ALTER ROLE streaming_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE streaming_user SET default_transaction_deferrable TO on;
ALTER ROLE streaming_user SET default_time_zone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE streaming_service_db TO streaming_user;
\c streaming_service_db
GRANT SCHEMA public TO streaming_user;
\q
```

### ✅ Verificar que funcionó:
```powershell
psql -U streaming_user -d streaming_service_db
# Debería pedirte contraseña: streaming_pass_123
# Si entra, salir con: \q
```

---

## 🎯 PASO 2: Instalar Dependencias

### Backend
```powershell
cd backend
npm install
```

### Frontend (en otra terminal/tab)
```powershell
cd frontend
npm install
```

---

## 🎯 PASO 3: Configurar Base de Datos con Prisma

### Vuelve a la carpeta backend
```powershell
cd backend
```

### Ejecutar migraciones (crea todas las tablas)
```powershell
npx prisma migrate dev
```

### Sembrar datos iniciales
```powershell
npx prisma db seed
```

✅ **Hecho!** Se crearon:
- Tablas en PostgreSQL
- Admin: `admin@gmail.com` / `admin123`
- Cliente: `cliente@test.com` / `cliente123`
- Servicios de prueba (Netflix, Spotify, etc)
- Métodos de pago

---

## 🎯 PASO 4: Iniciar Servidores

### Terminal 1: Backend
```powershell
cd backend
npm run dev
# Debería mostrar: 🚀 Server running on port 3000
```

### Terminal 2: Frontend
```powershell
cd frontend
npm run dev
# Debería mostrar: Local: http://localhost:5173
```

---

## ✅ VERIFICACIÓN FINAL

| Prueba | URL | Esperado |
|--------|-----|----------|
| **Backend vivo** | http://localhost:3000/health | JSON: `status: OK` |
| **Frontend** | http://localhost:5173 | Página carga |
| **Prisma Studio** | `cd backend && npx prisma studio` | http://localhost:5555 |

---

## 🔑 Datos de Prueba

### Cliente
```
Email: cliente@test.com
Contraseña: cliente123
```

### Admin
```
Email: admin@gmail.com
Contraseña: admin123
```

### Base de Datos
```
Host: localhost
Puerto: 5432
Usuario: streaming_user
Contraseña: streaming_pass_123
Base de datos: streaming_service_db
```

---

## 🔗 Strings de Conexión

### Para .env (ya configurado)
```
DATABASE_URL=postgresql://streaming_user:streaming_pass_123@localhost:5432/streaming_service_db
```

### Para conexión manual
```powershell
psql -U streaming_user -h localhost -d streaming_service_db
```

---

## ⚠️ Si algo falla...

### Error: "psql: command not found"
→ Ver: `POSTGRESQL-SETUP.md`

### Error: "Connection refused" a PostgreSQL
→ Reiniciar servicio PostgreSQL (buscar "Servicios" en Windows)

### Error: "Password authentication failed"
→ Verificar contraseña en `.env`: `streaming_pass_123`

### Error: "Cannot find module"
→ Ejecutar: `npm install`

### Base de datos corrupta
→ Ejecutar: `npx prisma migrate reset`

---

## 📚 Documentación Completa

- **Inicialización**: `INICIALIZACIÓN.md`
- **PostgreSQL**: `POSTGRESQL-SETUP.md`
- **Arquitectura**: `.github/copilot-instructions.md`

---

## 🎉 ¡LISTO!

Ya puedes:
- ✅ Acceder al frontend en http://localhost:5173
- ✅ Hacer login con `cliente@test.com` / `cliente123`
- ✅ Ver datos en Prisma Studio
- ✅ Hacer requests a la API

**Próximo paso**: Ver documentación para entender la estructura del proyecto.

---

**¿Preguntas?** Consulta los archivos `.md` de documentación o revisa el `POSTGRESQL-SETUP.md` para solucionar problemas.
