/*
  Warnings:

  - A unique constraint covering the columns `[org_id,idempotencyKey]` on the table `stock_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "stock_transactions" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "stock_transactions_org_id_idempotencyKey_key" ON "stock_transactions"("org_id", "idempotencyKey");
