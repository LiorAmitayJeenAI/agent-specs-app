/*
  Warnings:

  - You are about to drop the column `description` on the `UseCase` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DataSource" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "field_name" TEXT,
ADD COLUMN     "size" INTEGER,
ADD COLUMN     "step_id" TEXT;

-- AlterTable
ALTER TABLE "GlossaryTerm" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "document_author_name" DROP DEFAULT,
ALTER COLUMN "requested_agent_name" DROP DEFAULT,
ALTER COLUMN "short_agent_description" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "RequirementDocument" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SuccessMetric" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UseCase" DROP COLUMN "description",
ALTER COLUMN "user_question" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;
