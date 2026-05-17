-- AlterTable: make user_question nullable (data now lives in UseCaseQAPair)
ALTER TABLE "UseCase" ALTER COLUMN "user_question" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UseCaseQAPair" (
    "qa_pair_id" TEXT NOT NULL,
    "use_case_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "question" TEXT NOT NULL,
    "expected_answer" TEXT NOT NULL,
    "data_source_ref" TEXT,
    "data_source_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UseCaseQAPair_pkey" PRIMARY KEY ("qa_pair_id")
);

-- Migrate existing data: copy user_question/expected_answer into qa_pairs
INSERT INTO "UseCaseQAPair" ("qa_pair_id", "use_case_id", "order", "question", "expected_answer", "updated_at")
SELECT
    gen_random_uuid()::text,
    "use_case_id",
    1,
    COALESCE("user_question", ''),
    COALESCE("expected_answer", ''),
    NOW()
FROM "UseCase"
WHERE "user_question" IS NOT NULL AND TRIM("user_question") <> '';

-- AddForeignKey
ALTER TABLE "UseCaseQAPair" ADD CONSTRAINT "UseCaseQAPair_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "UseCase"("use_case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UseCaseQAPair" ADD CONSTRAINT "UseCaseQAPair_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "DataSource"("data_source_id") ON DELETE SET NULL ON UPDATE CASCADE;
