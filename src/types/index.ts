// ─── File Attachments ──────────────────────────────────────────────────────────

export type FileKind = "image" | "document" | "other";

export type FileUploadStatus = "pending" | "uploading" | "uploaded" | "failed";

export interface FileAttachment {
  id: string;
  name: string;
  /** Object URL (local) or proxy URL (after upload) */
  url: string;
  kind: FileKind;
  size: number;
  /** Base64 data URL – populated for images only */
  preview?: string;
  /** Upload status */
  uploadStatus: FileUploadStatus;
  /** Blob path in Azure Storage (populated after upload) */
  blobPath?: string;
  /** Full blob URL (populated after upload) */
  blobUrl?: string;
  /** Server-side file ID (populated after upload) */
  fileId?: string;
  /** MIME type */
  mimeType?: string;
}

// ─── Flow Steps ────────────────────────────────────────────────────────────────

export interface FlowStep {
  id: string;
  order: number;
  description: string;
  hasCalculation: boolean;
  calculationDetails: string;
  files: FileAttachment[];
  isCollapsed: boolean;
}

// ─── QA Pairs ───────────────────────────────────────────────────────────────────

export interface QAPair {
  id: string;
  order: number;
  question: string;
  expectedAnswer: string;
  /** Free-text description of the data source for this answer */
  dataSourceRef: string;
  /** Optional FK to an existing DataSource entity */
  dataSourceId?: string;
}

// ─── Use Cases ─────────────────────────────────────────────────────────────────

export interface UseCase {
  id: string;
  useCaseName: string;
  /** Use case description */
  title: string;
  qaPairs: QAPair[];
  performer: string;
  systemsInvolved: string[];
  additionalNotes: string;
  flowSteps: FlowStep[];
  isCollapsed: boolean;
}

// ─── Data Sources ──────────────────────────────────────────────────────────────

export interface DataSource {
  id: string;
  name: string;
  type: string;
  description: string;
  accessMethod: string;
  files: FileAttachment[];
}

// ─── Concepts ──────────────────────────────────────────────────────────────────

export interface Concept {
  id: string;
  term: string;
  definition: string;
  examples: string;
}

// ─── Success Metrics ───────────────────────────────────────────────────────────

export type MetricPriority = "high" | "medium" | "low";

export interface SuccessMetric {
  id: string;
  metric: string;
  target: string;
  measurementMethod: string;
  priority: MetricPriority;
}

// ─── Stepper ───────────────────────────────────────────────────────────────────

export interface StepConfig {
  id: number;
  title: string;
  subtitle: string;
}

// ─── Project Intake ────────────────────────────────────────────────────────────

export interface ProjectIntake {
  clientName: string;
  documentAuthorName: string;
  department: string;
  position: string;
}

export interface AgentDetails {
  requestedAgentName: string;
  shortAgentDescription: string;
}

// ─── Uploaded File Reference ─────────────────────────────────────────────────────

export interface UploadedFileRef {
  fileId: string;
  blobPath: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  stepId?: string;
  fieldName?: string;
}

// ─── Full Form Output ──────────────────────────────────────────────────────────

export interface FormOutput {
  projectId?: string;
  projectIntake: ProjectIntake;
  agentDetails: AgentDetails;
  useCases: UseCase[];
  dataSources: DataSource[];
  concepts: Concept[];
  successMetrics: SuccessMetric[];
  submittedAt: string;
  uploadedFiles?: UploadedFileRef[];
}
