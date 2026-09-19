-- CreateEnum
CREATE TYPE "SetupStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "setupStatus" "SetupStatus" NOT NULL DEFAULT 'NOT_STARTED';
