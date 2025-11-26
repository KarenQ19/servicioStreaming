# 🚀 INSTRUCCIONES FINALES - OCR CORREGIDO

## ⚡ Pasos Rápidos Para Probar

### 1️⃣ Reiniciar Backend (Importante)

```powershell
# En la terminal donde corre el backend
# Presiona: Ctrl + C

# Luego:
cd backend
npm run dev
```

El backend debería mostrar:
```
✅ Server running on port 3000
✅ Health check: http://localhost:3000/health
```

### 2️⃣ Verificar Frontend Funciona

Abre en navegador: `http://localhost:5173`

### 3️⃣ Login y Agregar Servicios al Carrito

```
Email: cliente@test.com
Contraseña: cliente123
```

### 4️⃣ Ir a Carrito y Hacer Checkout

1. Click en "🛒 Carrito"
2. Ver items agregados
3. Click en "Proceder a Suscripción"

### 5️⃣ Seleccionar Método de Pago

- **QR**: Permite escanear código
- **Transferencia**: Muestra datos bancarios

### 6️⃣ ¡Validar Comprobante OCR!

En el paso de pago, aparecerá:

**"Validar comprobante de pago"** ← Aquí está el OCR

1. Arrastra una imagen de comprobante
2. Click "Validar comprobante"
3. OCR procesará la imagen en segundos

---

## 📸 Formatos Aceptados para OCR

✅ JPEG, PNG, GIF, BMP, TIFF, WebP
❌ PDF (actualmente no soporta)
📏 Máximo 10MB

---

## 🧪 Probar OCR SIN Autenticación (Endpoint Demo)

### Opción 1: cURL
```bash
curl -X POST http://localhost:3000/api/v1/qr/demo-ocr \
  -F "comprobante=@C:\ruta\a\tu\comprobante.jpg"
```

### Opción 2: Desde PowerShell
```powershell
$imageFile = "C:\Users\Karen\Desktop\comprobante.jpg"
$uri = "http://localhost:3000/api/v1/qr/demo-ocr"

$form = @{
    comprobante = Get-Item -Path $imageFile
}

Invoke-RestMethod -Uri $uri -Method Post -Form $form
```

### Opción 3: Script de Prueba
```powershell
cd backend
npx ts-node test-ocr-fixed.ts
```

---

## 🔍 Verificar Que Todo Funciona

### Prueba 1: Health Check
```bash
curl http://localhost:3000/health

# Respuesta esperada:
# {"status":"OK","message":"Streaming Service API is running",...}
```

### Prueba 2: Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cliente@test.com","password":"cliente123"}'

# Obtiene un token JWT
```

### Prueba 3: Obtener Servicios
```bash
curl http://localhost:3000/api/v1/catalogo/servicios

# Lista todos los servicios disponibles
```

### Prueba 4: OCR Demo
```bash
curl -X POST http://localhost:3000/api/v1/qr/demo-ocr \
  -F "comprobante=@tu_imagen.jpg"

# Retorna datos extraídos por OCR
```

---

## 📊 Datos Que Extrae OCR

Cuando subes una imagen de comprobante, OCR extrae:

```json
{
  "monto": "15000",           // Monto de la transferencia
  "fecha": "24-11-2025",      // Fecha del movimiento
  "referencia": "REF123456",  // Código de referencia
  "transaccion": "TXN987654", // Número de transacción
  "banco": "Banco Estado",    // Banco emisor
  "rut": "12345678-9",        // RUT del titular
  "codigoQR": null            // Código QR si existe
}
```

---

## ✅ Verificación de Correcciones

| Prueba | Comando | Esperado |
|--------|---------|----------|
| Backend activo | `curl http://localhost:3000/health` | `status: OK` |
| Login funciona | `curl -X POST .../auth/login` | Token JWT retornado |
| Servicios visibles | `curl .../catalogo/servicios` | Lista de servicios |
| OCR accesible | `curl -X POST .../qr/demo-ocr -F "..."` | Datos extraídos |
| Frontend abre | Navegador a `http://localhost:5173` | Página carga |

---

## 🚨 Si Algo Falla

### Error: "Connection refused"
```powershell
# Backend no está corriendo
# Solución:
cd backend
npm run dev
```

### Error: "Cannot find module"
```powershell
# Faltan dependencias
# Solución:
cd backend
npm install
```

### Error: "Port 3000 already in use"
```powershell
# Otro proceso usa el puerto
# Solución:
netstat -ano | findstr :3000
taskkill /PID [numero] /F

# O cambiar puerto en backend/.env:
# PORT=3001
```

### Error: "Database connection failed"
```powershell
# PostgreSQL no está corriendo
# Solución:
# 1. Windows: Buscar "Servicios" -> PostgreSQL -> Iniciar
# 2. PowerShell:
Start-Service postgresql-x64-18

# 3. Verificar:
psql -U streaming_user -d streaming_service_db
```

### OCR Error: "Worker initialization failed"
```powershell
# Tesseract.js no está instalado
# Solución:
cd backend
npm install tesseract.js sharp
npm run dev  # Reiniciar
```

---

## 📁 Archivos Corregidos (Para Referencia)

```
backend/
├── src/
│   ├── controllers/
│   │   └── ✅ validacionOCRController.ts (Corregido)
│   ├── services/
│   │   └── ✅ ocrService.ts (Mejorado)
│   └── routes/
│       └── ✅ qr.ts (Reorganizado)
│
└── ✅ test-ocr-fixed.ts (Nuevo - Script de prueba)
```

---

## 📚 Documentación

- **Correcciones detalladas**: `OCR-FIXES.md`
- **Resumen visual**: `RESUMEN-CORRECCIONES-OCR.md`
- **Arquitectura general**: `.github/copilot-instructions.md`
- **Inicialización**: `INICIALIZACIÓN.md`

---

## 🎉 ¡Listo!

El OCR debería estar 100% funcional. 

**Pasos siguientes**:
1. Prueba subiendo un comprobante real
2. Verifica que se extraigan los datos correctamente
3. Ajusta los patrones de extracción si es necesario (en `extraerInformacion()`)

**¿Preguntas o problemas?** Revisa los logs en la consola del backend (`npm run dev`).

