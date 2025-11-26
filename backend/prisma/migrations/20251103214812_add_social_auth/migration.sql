/*
  Warnings:

  - You are about to drop the column `duracionTipo` on the `servicios` table. All the data in the column will be lost.
  - You are about to drop the column `duracionValor` on the `servicios` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[googleId]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[facebookId]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TipoProveedor" AS ENUM ('LOCAL', 'GOOGLE', 'FACEBOOK');

-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "avatar" TEXT,
ADD COLUMN     "facebookId" TEXT,
ADD COLUMN     "googleId" TEXT,
ADD COLUMN     "proveedor" "TipoProveedor" NOT NULL DEFAULT 'LOCAL',
ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable
ALTER TABLE "servicios" DROP COLUMN "duracionTipo",
DROP COLUMN "duracionValor";

-- DropEnum
DROP TYPE "public"."TipoDuracion";

-- CreateIndex
CREATE UNIQUE INDEX "clientes_googleId_key" ON "clientes"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_facebookId_key" ON "clientes"("facebookId");
