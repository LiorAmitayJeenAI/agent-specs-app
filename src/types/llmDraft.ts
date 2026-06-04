// ─── LLM draft polish (Summary step) ─────────────────────────────────────────

export type LlmDraftMode = "formal" | "polish";

export interface LlmDraftGeneral {
  shortAgentDescription: string;
}

export interface LlmDraftProtectedFields {
  clientName: string;
  documentAuthorName: string;
  agentName: string;
}

export interface LlmDraftFileRef {
  id: string;
  name: string;
  kind: string;
  uploadStatus: string;
}

export interface LlmDraftQAPair {
  id: string;
  question: string;
  expectedAnswer: string;
  dataSourceRef: string;
}

export interface LlmDraftFlowStep {
  id: string;
  order: number;
  description: string;
  hasCalculation: boolean;
  calculationDetails: string;
  files: LlmDraftFileRef[];
}

export interface LlmDraftUseCase {
  id: string;
  useCaseName: string;
  title: string;
  performer: string;
  systemsInvolved: string[];
  additionalNotes: string;
  qaPairs: LlmDraftQAPair[];
  flowSteps: LlmDraftFlowStep[];
}

export interface LlmDraftDataSource {
  id: string;
  name: string;
  type: string;
  description: string;
  accessMethod: string;
  files: LlmDraftFileRef[];
}

export interface LlmDraftConcept {
  id: string;
  term: string;
  definition: string;
  examples: string;
}

export interface LlmDraftMetric {
  id: string;
  metric: string;
  target: string;
  measurementMethod: string;
}

export interface LlmDraftSections {
  protected: LlmDraftProtectedFields;
  general: LlmDraftGeneral;
  useCases: LlmDraftUseCase[];
  dataSources: LlmDraftDataSource[];
  concepts: LlmDraftConcept[];
  metrics: LlmDraftMetric[];
}

export type LlmDraftSectionKey =
  | "fullDocument"
  | "general"
  | "dataSources"
  | "concepts"
  | "metrics"
  | `useCase:${string}`;

export interface LlmDraftStatusResponse {
  configured: boolean;
  mode: LlmDraftMode;
}

export interface LlmDraftPolishRequest {
  sections: LlmDraftSections;
  mode?: LlmDraftMode;
}

export interface LlmDraftPolishResponse {
  sections: LlmDraftSections;
  mode: LlmDraftMode;
}
