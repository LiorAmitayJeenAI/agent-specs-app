-- Let PostgreSQL enforce project-owned cleanup during project deletion.
-- This protects production from FK failures if dependent rows exist when the
-- admin API deletes a project.

ALTER TABLE "UseCase" DROP CONSTRAINT IF EXISTS "UseCase_project_id_fkey";
ALTER TABLE "UseCase"
ADD CONSTRAINT "UseCase_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FlowStep" DROP CONSTRAINT IF EXISTS "FlowStep_use_case_id_fkey";
ALTER TABLE "FlowStep"
ADD CONSTRAINT "FlowStep_use_case_id_fkey"
FOREIGN KEY ("use_case_id") REFERENCES "UseCase"("use_case_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UseCaseQAPair" DROP CONSTRAINT IF EXISTS "UseCaseQAPair_use_case_id_fkey";
ALTER TABLE "UseCaseQAPair"
ADD CONSTRAINT "UseCaseQAPair_use_case_id_fkey"
FOREIGN KEY ("use_case_id") REFERENCES "UseCase"("use_case_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UseCaseQAPair" DROP CONSTRAINT IF EXISTS "UseCaseQAPair_data_source_id_fkey";
ALTER TABLE "UseCaseQAPair"
ADD CONSTRAINT "UseCaseQAPair_data_source_id_fkey"
FOREIGN KEY ("data_source_id") REFERENCES "DataSource"("data_source_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DataSource" DROP CONSTRAINT IF EXISTS "DataSource_project_id_fkey";
ALTER TABLE "DataSource"
ADD CONSTRAINT "DataSource_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GlossaryTerm" DROP CONSTRAINT IF EXISTS "GlossaryTerm_project_id_fkey";
ALTER TABLE "GlossaryTerm"
ADD CONSTRAINT "GlossaryTerm_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SuccessMetric" DROP CONSTRAINT IF EXISTS "SuccessMetric_project_id_fkey";
ALTER TABLE "SuccessMetric"
ADD CONSTRAINT "SuccessMetric_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SuccessMetric" DROP CONSTRAINT IF EXISTS "SuccessMetric_use_case_id_fkey";
ALTER TABLE "SuccessMetric"
ADD CONSTRAINT "SuccessMetric_use_case_id_fkey"
FOREIGN KEY ("use_case_id") REFERENCES "UseCase"("use_case_id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RequirementDocument" DROP CONSTRAINT IF EXISTS "RequirementDocument_project_id_fkey";
ALTER TABLE "RequirementDocument"
ADD CONSTRAINT "RequirementDocument_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "Project"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;
