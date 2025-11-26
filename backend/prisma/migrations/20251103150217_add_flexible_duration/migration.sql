-- CreateEnum
CREATE TYPE "TipoDuracion" AS ENUM ('DIA', 'SEMANA', 'MES', 'ANUAL');

-- AlterTable
ALTER TABLE "servicios" ADD COLUMN     "duracionTipo" "TipoDuracion" NOT NULL DEFAULT 'MES',
ADD COLUMN     "duracionValor" INTEGER NOT NULL DEFAULT 1;
