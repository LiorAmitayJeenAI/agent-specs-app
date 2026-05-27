-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'sent_to_client';

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'sent_to_client';
