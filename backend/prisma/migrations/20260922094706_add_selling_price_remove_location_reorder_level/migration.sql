/*
  Warnings:

  - You are about to drop the column `reorder_level` on the `item_locations` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "item_locations_org_id_quantity_reorder_level_idx";

-- AlterTable
ALTER TABLE "item_locations" DROP COLUMN "reorder_level";

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "selling_price" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "item_locations_org_id_quantity_idx" ON "item_locations"("org_id", "quantity");
