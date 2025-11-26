-- AlterTable
ALTER TABLE "pagos" ADD COLUMN     "fechaValidacion" TIMESTAMP(3),
ADD COLUMN     "validadoPor" TEXT;

-- CreateTable
CREATE TABLE "validaciones_ocr" (
    "id" TEXT NOT NULL,
    "imagenUrl" TEXT NOT NULL,
    "textoExtraido" TEXT NOT NULL,
    "datosExtraidos" JSONB NOT NULL,
    "confianzaOCR" DOUBLE PRECISION NOT NULL,
    "montoDetectado" TEXT,
    "fechaDetectada" TEXT,
    "referenciaDetectada" TEXT,
    "transaccionDetectada" TEXT,
    "bancoDetectado" TEXT,
    "esValido" BOOLEAN NOT NULL,
    "coincidenciaMonto" BOOLEAN NOT NULL DEFAULT false,
    "coincidenciaFecha" BOOLEAN NOT NULL DEFAULT false,
    "coincidenciaReferencia" BOOLEAN NOT NULL DEFAULT false,
    "coincidenciaTransaccion" BOOLEAN NOT NULL DEFAULT false,
    "porcentajeCoincidencia" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pagoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,

    CONSTRAINT "validaciones_ocr_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "validaciones_ocr" ADD CONSTRAINT "validaciones_ocr_pagoId_fkey" FOREIGN KEY ("pagoId") REFERENCES "pagos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validaciones_ocr" ADD CONSTRAINT "validaciones_ocr_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
