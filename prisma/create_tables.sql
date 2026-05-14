-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Client" (
    "client_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("client_id")
);

-- CreateTable
CREATE TABLE "Project" (
    "project_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "document_author_name" TEXT NOT NULL,
    "requested_agent_name" TEXT NOT NULL,
    "short_agent_description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "UseCase" (
    "use_case_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "use_case_name" TEXT NOT NULL,
    "title" TEXT,
    "user_question" TEXT NOT NULL,
    "expected_answer" TEXT,
    "performed_by" TEXT,
    "current_systems" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UseCase_pkey" PRIMARY KEY ("use_case_id")
);

-- CreateTable
CREATE TABLE "FlowStep" (
    "step_id" TEXT NOT NULL,
    "use_case_id" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "step_description" TEXT NOT NULL,
    "has_calculation" BOOLEAN NOT NULL DEFAULT false,
    "calculation_details" TEXT,
    "notes" TEXT,

    CONSTRAINT "FlowStep_pkey" PRIMARY KEY ("step_id")
);

-- CreateTable
CREATE TABLE "File" (
    "file_id" TEXT NOT NULL,
    "related_entity_type" TEXT NOT NULL,
    "related_entity_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT,
    "blob_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("file_id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "data_source_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "source_type" TEXT,
    "description" TEXT,
    "access_method" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("data_source_id")
);

-- CreateTable
CREATE TABLE "GlossaryTerm" (
    "term_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT,
    "examples" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlossaryTerm_pkey" PRIMARY KEY ("term_id")
);

-- CreateTable
CREATE TABLE "SuccessMetric" (
    "success_metric_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "use_case_id" TEXT,
    "metric_name" TEXT NOT NULL,
    "target" TEXT,
    "measurement_method" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SuccessMetric_pkey" PRIMARY KEY ("success_metric_id")
);

-- CreateTable
CREATE TABLE "RequirementDocument" (
    "requirement_document_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content_json" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequirementDocument_pkey" PRIMARY KEY ("requirement_document_id")
);

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("client_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UseCase" ADD CONSTRAINT "UseCase_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStep" ADD CONSTRAINT "FlowStep_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "UseCase"("use_case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlossaryTerm" ADD CONSTRAINT "GlossaryTerm_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessMetric" ADD CONSTRAINT "SuccessMetric_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SuccessMetric" ADD CONSTRAINT "SuccessMetric_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "UseCase"("use_case_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementDocument" ADD CONSTRAINT "RequirementDocument_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;
