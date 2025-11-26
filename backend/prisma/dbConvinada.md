// Schema Prisma Optimizado
// Combina lo mejor del diagrama original con mejoras técnicas

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// MODELO CLIENTE
// ============================================
model Cliente {
  id            String   @id @default(cuid())
  nombre        String
  email         String   @unique
  password      String
  telefono      String?
  activo        Boolean  @default(true)  // Soft delete
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relaciones
  suscripciones Suscripcion[]
  carritos      Carrito[]
  pagos         Pago[]
  credenciales  Credenciales?  // 1:1 - Un cliente solo tiene UN conjunto de credenciales

  @@map("clientes")
}

// ============================================
// MODELO ADMINISTRADOR
// ============================================
model Administrador {
  id        String   @id @default(cuid())
  nombre    String
  email     String   @unique
  password  String
  activo    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones
  catalogo  Catalogo?  // 1:1 - Un admin gestiona UN catálogo

  @@map("administradores")
}

// ============================================
// MODELO CATÁLOGO (RESTAURADO)
// ============================================
// RAZÓN: Permite organizar servicios en grupos lógicos
// EJEMPLO: "Catálogo Streaming", "Catálogo Gaming", "Catálogo Productividad"
model Catalogo {
  id        String   @id @default(cuid())
  nombre    String   // Ej: "Servicios de Streaming", "Gaming", etc.
  descripcion String?
  activo    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones
  administradorId String        @unique  // 1:1 con Administrador
  administrador   Administrador @relation(fields: [administradorId], references: [id])
  
  servicios       Servicio[]    // 1:N - Un catálogo tiene muchos servicios

  @@map("catalogos")
}

// ============================================
// MODELO SERVICIO
// ============================================
model Servicio {
  id              String   @id @default(cuid())
  nombre          String   // Ej: "Netflix", "Spotify"
  descripcion     String
  plan            String   // ⭐ RESTAURADO: "Básico", "Premium", "Familiar"
  precio          Decimal  @db.Decimal(10, 2)
  categoria       String   // "Streaming", "Música", "Gaming"
  disponible      Boolean  @default(true)
  caracteristicas Json?    // Flexible para datos específicos
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relaciones
  catalogoId    String        // ⭐ RESTAURADO: Pertenece a un Catálogo
  catalogo      Catalogo      @relation(fields: [catalogoId], references: [id])
  
  suscripciones Suscripcion[]
  carritoItems  CarritoItem[]

  @@map("servicios")
}

// ============================================
// MODELO SUSCRIPCIÓN
// ============================================
model Suscripcion {
  id          String            @id @default(cuid())
  estado      EstadoSuscripcion @default(ACTIVA)
  fechaInicio DateTime          @default(now())
  fechaFin    DateTime
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  // Relaciones
  clienteId String
  cliente   Cliente @relation(fields: [clienteId], references: [id])
  
  servicioId String
  servicio   Servicio @relation(fields: [servicioId], references: [id])
  
  credenciales Credenciales?  // 1:1 - Una suscripción tiene UN conjunto de credenciales
  pagos        Pago[]

  @@map("suscripciones")
}

// ============================================
// MODELO CREDENCIALES (MEJORADO)
// ============================================
// CAMBIO CLAVE: Relación 1:1 con Cliente Y con Suscripción
// RAZÓN: Evita duplicados y mantiene consistencia
model Credenciales {
  id       String   @id @default(cuid())
  usuario  String   // Usuario del servicio (ej: usuario de Netflix)
  password String   // Contraseña del servicio
  activas  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones - TODAS ÚNICAS (1:1)
  clienteId     String      @unique  // ⭐ Un cliente = UN conjunto de credenciales
  cliente       Cliente     @relation(fields: [clienteId], references: [id])
  
  suscripcionId String      @unique  // ⭐ Una suscripción = UN conjunto de credenciales
  suscripcion   Suscripcion @relation(fields: [suscripcionId], references: [id])

  // ⭐ REMOVIDO servicioId - Es redundante porque:
  // Credenciales → Suscripción → Servicio (ya existe la relación)

  @@map("credenciales")
}

// ============================================
// MODELO CARRITO
// ============================================
model Carrito {
  id        String   @id @default(cuid())
  activo    Boolean  @default(true)  // Para saber si está en proceso o abandonado
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones
  clienteId String
  cliente   Cliente @relation(fields: [clienteId], references: [id])
  
  items CarritoItem[]
  pagos Pago[]

  @@map("carritos")
}

// ============================================
// MODELO CARRITO ITEM
// ============================================
model CarritoItem {
  id       String  @id @default(cuid())
  cantidad Int     @default(1)
  precio   Decimal @db.Decimal(10, 2)  // ⭐ Precio histórico (puede cambiar después)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones
  carritoId String
  carrito   Carrito @relation(fields: [carritoId], references: [id], onDelete: Cascade)
  
  servicioId String
  servicio   Servicio @relation(fields: [servicioId], references: [id])

  @@map("carrito_items")
}

// ============================================
// MODELO MÉTODO DE PAGO
// ============================================
model MetodoPago {
  id          String         @id @default(cuid())
  nombre      String         // "Tarjeta Visa", "QR", "Transferencia"
  tipo        TipoMetodoPago
  disponible  Boolean        @default(true)
  descripcion String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  // Relaciones
  pagos Pago[]

  @@map("metodos_pago")
}

// ============================================
// MODELO PAGO
// ============================================
model Pago {
  id          String     @id @default(cuid())
  monto       Decimal    @db.Decimal(10, 2)
  estado      EstadoPago @default(PENDIENTE)
  referencia  String?    @unique  // Para pagos externos (Stripe, PayPal)
  descripcion String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Relaciones
  clienteId String
  cliente   Cliente @relation(fields: [clienteId], references: [id])
  
  // ⭐ OPCIONAL: Un pago puede ser por un carrito O por una suscripción
  carritoId String?
  carrito   Carrito? @relation(fields: [carritoId], references: [id])
  
  suscripcionId String?
  suscripcion   Suscripcion? @relation(fields: [suscripcionId], references: [id])
  
  metodoPagoId String
  metodoPago   MetodoPago @relation(fields: [metodoPagoId], references: [id])
  
  qr QR?  // ⭐ CAMBIADO a 1:1 (un pago tiene máximo un QR)

  @@map("pagos")
}

// ============================================
// MODELO QR (MEJORADO)
// ============================================
// CAMBIO: Relación 1:1 con Pago (lo más lógico)
model QR {
  id        String   @id @default(cuid())
  codigo    String   @unique  // El código QR generado
  estado    EstadoQR @default(ACTIVO)
  expiresAt DateTime // Fecha de expiración
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relaciones
  pagoId String @unique  // ⭐ Un QR = Un Pago (1:1)
  pago   Pago   @relation(fields: [pagoId], references: [id])

  @@map("qr_codes")
}

// ============================================
// ENUMS (Type-Safety)
// ============================================

enum EstadoSuscripcion {
  ACTIVA
  PAUSADA
  CANCELADA
  EXPIRADA
}

enum TipoMetodoPago {
  TARJETA_CREDITO
  TARJETA_DEBITO
  TRANSFERENCIA
  QR
  EFECTIVO
}

enum EstadoPago {
  PENDIENTE
  COMPLETADO
  FALLIDO
  REEMBOLSADO
}

enum EstadoQR {
  ACTIVO
  USADO
  EXPIRADO
}

// ============================================
// RESUMEN DE MEJORAS
// ============================================
// ✅ Catálogo restaurado (organización de servicios)
// ✅ Campo "plan" en Servicio (Básico, Premium, etc.)
// ✅ Credenciales 1:1 con Cliente (evita duplicados)
// ✅ QR 1:1 con Pago (lo más lógico)
// ✅ Timestamps en todo (auditoría)
// ✅ Enums para type-safety
// ✅ Soft deletes (activo, disponible)
// ✅ Precio histórico en CarritoItem
// ✅ Referencia de pago para integraciones
// ✅ Pago flexible (carrito O suscripción)