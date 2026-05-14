-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Client" (
    "client_id" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("client_id")
);

-- CreateTable
CREATE TABLE "Project" (
    "project_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "project_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "UseCase" (
    "use_case_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "use_case_name" TEXT NOT NULL,
    "description" TEXT,
    "performed_by" TEXT,
    "current_systems" TEXT[],
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UseCase_pkey" PRIMARY KEY ("use_case_id")
);

-- CreateTable
CREATE TABLE "UseCaseQuestion" (
    "question_id" TEXT NOT NULL,
    "use_case_id" TEXT NOT NULL,
    "user_question" TEXT NOT NULL,
    "expected_answer" TEXT,

    CONSTRAINT "UseCaseQuestion_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "Flow" (
    "flow_id" TEXT NOT NULL,
    "use_case_id" TEXT NOT NULL,
    "flow_name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("flow_id")
);

-- CreateTable
CREATE TABLE "FlowStep" (
    "step_id" TEXT NOT NULL,
    "flow_id" TEXT NOT NULL,
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
    "use_case_id" TEXT NOT NULL,
    "source_name" TEXT NOT NULL,
    "location_access" TEXT,
    "access_method" TEXT,
    "data_format" TEXT,
    "fields_description" TEXT,
    "example_data" TEXT,
    "relevant_data" TEXT,
    "notes" TEXT,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("data_source_id")
);

-- CreateTable
CREATE TABLE "GlossaryTerm" (
    "term_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT,

    CONSTRAINT "GlossaryTerm_pkey" PRIMARY KEY ("term_id")
);

-- CreateTable
CREATE TABLE "KPI" (
    "kpi_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "use_case_id" TEXT,
    "kpi_name" TEXT NOT NULL,
    "kpi_description" TEXT,
    "success_direction" TEXT,

    CONSTRAINT "KPI_pkey" PRIMARY KEY ("kpi_id")
);

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("client_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UseCase" ADD CONSTRAINT "UseCase_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UseCaseQuestion" ADD CONSTRAINT "UseCaseQuestion_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "UseCase"("use_case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flow" ADD CONSTRAINT "Flow_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "UseCase"("use_case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowStep" ADD CONSTRAINT "FlowStep_flow_id_fkey" FOREIGN KEY ("flow_id") REFERENCES "Flow"("flow_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "UseCase"("use_case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlossaryTerm" ADD CONSTRAINT "GlossaryTerm_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPI" ADD CONSTRAINT "KPI_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KPI" ADD CONSTRAINT "KPI_use_case_id_fkey" FOREIGN KEY ("use_case_id") REFERENCES "UseCase"("use_case_id") ON DELETE SET NULL ON UPDATE CASCADE;
