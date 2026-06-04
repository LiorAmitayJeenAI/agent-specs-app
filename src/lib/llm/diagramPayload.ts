import { createHash } from "crypto";
import type { Prisma } from "@/generated/prisma/client";

export type DiagramProjectInclude = Prisma.ProjectGetPayload<{
  include: {
    client: true;
    use_cases: {
      include: {
        flow_steps: { orderBy: { step_number: "asc" } };
        qa_pairs: { orderBy: { order: "asc" } };
      };
    };
    data_sources: true;
    glossary: true;
    success_metrics: true;
  };
}>;

export interface DiagramPayload {
  project: {
    clientName: string;
    projectName: string;
    requestedAgentName: string;
    shortAgentDescription: string;
    projectManagerName: string | null;
  };
  useCases: Array<{
    id: string;
    useCaseName: string;
    title: string | null;
    performer: string | null;
    systemsInvolved: string[];
    additionalNotes: string | null;
    flowSteps: Array<{
      order: number;
      description: string;
      hasCalculation: boolean;
      calculationDetails: string | null;
    }>;
    qaPairs: Array<{
      question: string;
      expectedAnswer: string;
      dataSourceRef: string | null;
    }>;
  }>;
  dataSources: Array<{
    name: string;
    type: string | null;
    description: string | null;
    accessMethod: string | null;
  }>;
  concepts: Array<{ term: string; definition: string | null }>;
  successMetrics: Array<{ metric: string; target: string | null }>;
}

export function buildDiagramPayload(project: DiagramProjectInclude): DiagramPayload {
  return {
    project: {
      clientName: project.client.client_name,
      projectName: project.project_name,
      requestedAgentName: project.requested_agent_name,
      shortAgentDescription: project.short_agent_description,
      projectManagerName: project.project_manager_name,
    },
    useCases: project.use_cases.map((uc) => ({
      id: uc.use_case_id,
      useCaseName: uc.use_case_name,
      title: uc.title,
      performer: uc.performed_by,
      systemsInvolved: uc.current_systems,
      additionalNotes: uc.notes,
      flowSteps: uc.flow_steps.map((step) => ({
        order: step.step_number,
        description: step.step_description,
        hasCalculation: step.has_calculation,
        calculationDetails: step.calculation_details,
      })),
      qaPairs: uc.qa_pairs.map((qa) => ({
        question: qa.question,
        expectedAnswer: qa.expected_answer,
        dataSourceRef: qa.data_source_ref,
      })),
    })),
    dataSources: project.data_sources.map((ds) => ({
      name: ds.source_name,
      type: ds.source_type,
      description: ds.description,
      accessMethod: ds.access_method,
    })),
    concepts: project.glossary.map((g) => ({
      term: g.term,
      definition: g.definition,
    })),
    successMetrics: project.success_metrics.map((m) => ({
      metric: m.metric_name,
      target: m.target,
    })),
  };
}

export function hashDiagramPayload(payload: DiagramPayload): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}
