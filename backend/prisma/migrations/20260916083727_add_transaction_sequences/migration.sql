-- CreateTable
CREATE TABLE "transaction_sequences" (
    "id" UUID NOT NULL,
    "org_id" UUID NOT NULL,
    "transaction_type" "TransactionType" NOT NULL,
    "sequence_date" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_sequences_org_id_sequence_date_idx" ON "transaction_sequences"("org_id", "sequence_date");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_sequences_org_id_transaction_type_sequence_date_key" ON "transaction_sequences"("org_id", "transaction_type", "sequence_date");

-- AddForeignKey
ALTER TABLE "transaction_sequences" ADD CONSTRAINT "transaction_sequences_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
