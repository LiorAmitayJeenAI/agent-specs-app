-- Align persisted structure with the current form payload and generated summary.
-- Blob/file metadata redesign is intentionally left for a later migration.

-- Client audit timestamp
ALTER TABLE "Client" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Project-level fields collected by the intake and used by the summary document
ALTER TABLE "Project"
ADD COLUMN "document_author_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN "requested_agent_name" TEXT NOT NULL DEFAULT '',
ADD COLUMN "short_agent_description" TEXT NOT NULL DEFAULT '',
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Use cases currently contain their own scenario question/answer in the UI
ALTER TABLE "UseCase"
ADD COLUMN "title" TEXT,
ADD COLUMN "user_question" TEXT NOT NULL DEFAULT '',
ADD COLUMN "expected_answer" TEXT,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "UseCase" uc
SET
  "user_question" = COALESCE(q."user_question", ''),
  "expected_answer" = q."expected_answer",
  "title" = NULLIF(LEFT(COALESCE(q."user_question", ''), 50), '')
FROM (
  SELECT DISTINCT ON ("use_case_id")
    "use_case_id",
    "user_question",
    "expected_answer"
  FROM "UseCaseQuestion"
  ORDER BY "use_case_id", "question_id"
) q
WHERE uc."use_case_id" = q."use_case_id";

-- Flow steps belong directly to the current form's use case
ALTER TABLE "FlowStep" ADD COLUMN "use_case_id" TEXT;

UPDATE "FlowStep" fs
SET "use_case_id" = f."use_case_id"
FROM "Flow" f
WHERE fs."flow_id" = f."flow_id";

ALTER TABLE "FlowStep" ALTER COLUMN "use_case_id" SET NOT NULL;

ALTER TABLE "FlowStep" DROP CONSTRAINT "FlowStep_flow_id_fkey";
ALTER TABLE "FlowStep" DROP COLUMN "flow_id";

ALTER TABLE "FlowStep"
ADD CONSTRAINT "FlowStep_use_case_id_fkey"
FOREIGN KEY ("use_case_id") REFERENCES "UseCase"("use_case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data sources are collected once at project scope
ALTER TABLE "DataSource"
ADD COLUMN "project_id" TEXT,
ADD COLUMN "source_type" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "DataSource" ds
SET "project_id" = uc."project_id"
FROM "UseCase" uc
WHERE ds."use_case_id" = uc."use_case_id";

UPDATE "DataSource"
SET "description" = COALESCE("notes", "relevant_data", "fields_description", "example_data");

ALTER TABLE "DataSource" ALTER COLUMN "project_id" SET NOT NULL;

ALTER TABLE "DataSource" DROP CONSTRAINT "DataSource_use_case_id_fkey";
ALTER TABLE "DataSource" DROP COLUMN "use_case_id";
ALTER TABLE "DataSource" DROP COLUMN "location_access";
ALTER TABLE "DataSource" DROP COLUMN "data_format";
ALTER TABLE "DataSource" DROP COLUMN "fields_description";
ALTER TABLE "DataSource" DROP COLUMN "example_data";
ALTER TABLE "DataSource" DROP COLUMN "relevant_data";
ALTER TABLE "DataSource" DROP COLUMN "notes";

ALTER TABLE "DataSource"
ADD CONSTRAINT "DataSource_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Concepts include examples in the form and final document
ALTER TABLE "GlossaryTerm"
ADD COLUMN "examples" TEXT,
ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Success metrics match the current form fields
ALTER TABLE "KPI" RENAME TO "SuccessMetric";
ALTER TABLE "SuccessMetric" RENAME CONSTRAINT "KPI_pkey" TO "SuccessMetric_pkey";
ALTER TABLE "SuccessMetric" RENAME CONSTRAINT "KPI_project_id_fkey" TO "SuccessMetric_project_id_fkey";
ALTER TABLE "SuccessMetric" RENAME CONSTRAINT "KPI_use_case_id_fkey" TO "SuccessMetric_use_case_id_fkey";
ALTER TABLE "SuccessMetric" RENAME COLUMN "kpi_id" TO "success_metric_id";
ALTER TABLE "SuccessMetric" RENAME COLUMN "kpi_name" TO "metric_name";
ALTER TABLE "SuccessMetric" RENAME COLUMN "kpi_description" TO "target";
ALTER TABLE "SuccessMetric" ADD COLUMN "measurement_method" TEXT;
ALTER TABLE "SuccessMetric" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "SuccessMetric" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SuccessMetric" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SuccessMetric" DROP COLUMN "success_direction";

-- Persist the editable generated summary document
CREATE TABLE "RequirementDocument" (
  "requirement_document_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content_json" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RequirementDocument_pkey" PRIMARY KEY ("requirement_document_id")
);

ALTER TABLE "RequirementDocument"
ADD CONSTRAINT "RequirementDocument_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove tables that no longer match the current payload shape
DROP TABLE "UseCaseQuestion";
DROP TABLE "Flow";
