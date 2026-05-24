-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('client_draft', 'pm_review', 'completed');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "status" "ProjectStatus" NOT NULL DEFAULT 'client_draft';
