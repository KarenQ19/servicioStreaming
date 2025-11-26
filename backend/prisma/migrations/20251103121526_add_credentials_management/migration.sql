-- DropForeignKey
ALTER TABLE "public"."credenciales" DROP CONSTRAINT "credenciales_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "public"."credenciales" DROP CONSTRAINT "credenciales_suscripcionId_fkey";

-- AlterTable
ALTER TABLE "credenciales" ADD COLUMN     "asignadas" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notas" TEXT,
ADD COLUMN     "urlAcceso" TEXT,
ALTER COLUMN "clienteId" DROP NOT NULL,
ALTER COLUMN "suscripcionId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "credenciales" ADD CONSTRAINT "credenciales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credenciales" ADD CONSTRAINT "credenciales_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "suscripciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
