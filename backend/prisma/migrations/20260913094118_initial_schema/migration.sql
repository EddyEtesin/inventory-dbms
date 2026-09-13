-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'suspended', 'archived');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('invited', 'active', 'suspended', 'removed');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('system', 'custom');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('active', 'discontinued', 'archived');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('opening_balance', 'receive', 'issue', 'adjustment', 'transfer', 'return', 'damage', 'expiry', 'loss');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('pending', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "industry_type" TEXT NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "status" "MemberStatus" NOT NULL DEFAULT 'invited',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role_type" "RoleType" NOT NULL DEFAULT 'custom',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location_type" TEXT NOT NULL,
    "parent_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "contact_info" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category_id" UUID,
    "supplier_id" UUID,
    "unit_of_measure" TEXT NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "reorder_level" INTEGER NOT NULL DEFAULT 0,
    "status" "ItemStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_locations" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reorder_level" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "from_location_id" UUID NOT NULL,
    "to_location_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'pending',
    "reference" TEXT,
    "performed_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transactions" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "txn_type" "TransactionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT,
    "transfer_id" UUID,
    "performed_by" UUID NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_attributes" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "attr_key" TEXT NOT NULL,
    "attr_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_extensions" (
    "item_id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "extension_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "item_extensions_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organizations_industry_type_idx" ON "organizations"("industry_type");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "organization_members_org_id_status_idx" ON "organization_members"("org_id", "status");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE INDEX "organization_members_org_id_role_id_idx" ON "organization_members"("org_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_org_id_user_id_key" ON "organization_members"("org_id", "user_id");

-- CreateIndex
CREATE INDEX "roles_org_id_role_type_idx" ON "roles"("org_id", "role_type");

-- CreateIndex
CREATE UNIQUE INDEX "roles_org_id_id_key" ON "roles"("org_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_org_id_name_key" ON "roles"("org_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "locations_org_id_location_type_idx" ON "locations"("org_id", "location_type");

-- CreateIndex
CREATE INDEX "locations_org_id_parent_id_idx" ON "locations"("org_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_org_id_id_key" ON "locations"("org_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_org_id_name_key" ON "locations"("org_id", "name");

-- CreateIndex
CREATE INDEX "categories_org_id_parent_id_idx" ON "categories"("org_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_org_id_id_key" ON "categories"("org_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "categories_org_id_name_parent_id_key" ON "categories"("org_id", "name", "parent_id");

-- CreateIndex
CREATE INDEX "suppliers_org_id_status_idx" ON "suppliers"("org_id", "status");

-- CreateIndex
CREATE INDEX "suppliers_org_id_name_idx" ON "suppliers"("org_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_org_id_id_key" ON "suppliers"("org_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_org_id_name_key" ON "suppliers"("org_id", "name");

-- CreateIndex
CREATE INDEX "items_org_id_name_idx" ON "items"("org_id", "name");

-- CreateIndex
CREATE INDEX "items_org_id_category_id_idx" ON "items"("org_id", "category_id");

-- CreateIndex
CREATE INDEX "items_org_id_supplier_id_idx" ON "items"("org_id", "supplier_id");

-- CreateIndex
CREATE INDEX "items_org_id_status_idx" ON "items"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "items_org_id_id_key" ON "items"("org_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "items_org_id_sku_key" ON "items"("org_id", "sku");

-- CreateIndex
CREATE INDEX "item_locations_org_id_location_id_idx" ON "item_locations"("org_id", "location_id");

-- CreateIndex
CREATE INDEX "item_locations_org_id_item_id_idx" ON "item_locations"("org_id", "item_id");

-- CreateIndex
CREATE INDEX "item_locations_org_id_quantity_reorder_level_idx" ON "item_locations"("org_id", "quantity", "reorder_level");

-- CreateIndex
CREATE UNIQUE INDEX "item_locations_org_id_item_id_location_id_key" ON "item_locations"("org_id", "item_id", "location_id");

-- CreateIndex
CREATE INDEX "stock_transfers_org_id_item_id_idx" ON "stock_transfers"("org_id", "item_id");

-- CreateIndex
CREATE INDEX "stock_transfers_org_id_from_location_id_idx" ON "stock_transfers"("org_id", "from_location_id");

-- CreateIndex
CREATE INDEX "stock_transfers_org_id_to_location_id_idx" ON "stock_transfers"("org_id", "to_location_id");

-- CreateIndex
CREATE INDEX "stock_transfers_org_id_status_idx" ON "stock_transfers"("org_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_org_id_id_key" ON "stock_transfers"("org_id", "id");

-- CreateIndex
CREATE INDEX "stock_transactions_org_id_item_id_created_at_idx" ON "stock_transactions"("org_id", "item_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_transactions_org_id_location_id_created_at_idx" ON "stock_transactions"("org_id", "location_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_transactions_org_id_txn_type_idx" ON "stock_transactions"("org_id", "txn_type");

-- CreateIndex
CREATE INDEX "stock_transactions_org_id_performed_by_idx" ON "stock_transactions"("org_id", "performed_by");

-- CreateIndex
CREATE INDEX "stock_transactions_org_id_transfer_id_idx" ON "stock_transactions"("org_id", "transfer_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_transactions_org_id_id_key" ON "stock_transactions"("org_id", "id");

-- CreateIndex
CREATE INDEX "item_attributes_org_id_attr_key_idx" ON "item_attributes"("org_id", "attr_key");

-- CreateIndex
CREATE UNIQUE INDEX "item_attributes_org_id_item_id_attr_key_key" ON "item_attributes"("org_id", "item_id", "attr_key");

-- CreateIndex
CREATE INDEX "item_extensions_org_id_extension_type_idx" ON "item_extensions"("org_id", "extension_type");

-- CreateIndex
CREATE UNIQUE INDEX "item_extensions_org_id_item_id_key" ON "item_extensions"("org_id", "item_id");

-- CreateIndex
CREATE INDEX "audit_logs_org_id_created_at_idx" ON "audit_logs"("org_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_org_id_entity_type_entity_id_idx" ON "audit_logs"("org_id", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_org_id_user_id_idx" ON "audit_logs"("org_id", "user_id");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_org_id_role_id_fkey" FOREIGN KEY ("org_id", "role_id") REFERENCES "roles"("org_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_org_id_parent_id_fkey" FOREIGN KEY ("org_id", "parent_id") REFERENCES "locations"("org_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_org_id_parent_id_fkey" FOREIGN KEY ("org_id", "parent_id") REFERENCES "categories"("org_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_org_id_category_id_fkey" FOREIGN KEY ("org_id", "category_id") REFERENCES "categories"("org_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_org_id_supplier_id_fkey" FOREIGN KEY ("org_id", "supplier_id") REFERENCES "suppliers"("org_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_locations" ADD CONSTRAINT "item_locations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_locations" ADD CONSTRAINT "item_locations_org_id_item_id_fkey" FOREIGN KEY ("org_id", "item_id") REFERENCES "items"("org_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_locations" ADD CONSTRAINT "item_locations_org_id_location_id_fkey" FOREIGN KEY ("org_id", "location_id") REFERENCES "locations"("org_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_org_id_item_id_fkey" FOREIGN KEY ("org_id", "item_id") REFERENCES "items"("org_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_org_id_from_location_id_fkey" FOREIGN KEY ("org_id", "from_location_id") REFERENCES "locations"("org_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_org_id_to_location_id_fkey" FOREIGN KEY ("org_id", "to_location_id") REFERENCES "locations"("org_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_org_id_item_id_fkey" FOREIGN KEY ("org_id", "item_id") REFERENCES "items"("org_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_org_id_location_id_fkey" FOREIGN KEY ("org_id", "location_id") REFERENCES "locations"("org_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_org_id_transfer_id_fkey" FOREIGN KEY ("org_id", "transfer_id") REFERENCES "stock_transfers"("org_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_attributes" ADD CONSTRAINT "item_attributes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_attributes" ADD CONSTRAINT "item_attributes_org_id_item_id_fkey" FOREIGN KEY ("org_id", "item_id") REFERENCES "items"("org_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_extensions" ADD CONSTRAINT "item_extensions_org_id_item_id_fkey" FOREIGN KEY ("org_id", "item_id") REFERENCES "items"("org_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_extensions" ADD CONSTRAINT "item_extensions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
