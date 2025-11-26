/*
  Warnings:

  - A unique constraint covering the columns `[tipo]` on the table `metodos_pago` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "metodos_pago_tipo_key" ON "metodos_pago"("tipo");
