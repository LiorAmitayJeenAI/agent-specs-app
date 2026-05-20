"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { v4 as uuid } from "uuid";
import { LOCKED_FORM_STEP_IDS } from "@/lib/utils";
import type {
  UseCase,
  QAPair,
  FlowStep,
  FileAttachment,
  DataSource,
  Concept,
  SuccessMetric,
  FormOutput,
  ProjectIntake,
  AgentDetails,
  UploadedFileRef,
} from "@/types";

const lockedStepIds = new Set(LOCKED_FORM_STEP_IDS);

const getNextUnlockedStep = (step: number, direction: 1 | -1) => {
  let next = Math.min(Math.max(step + direction, 1), 6);

  while (lockedStepIds.has(next) && next > 1 && next < 6) {
    next += direction;
  }

  return Math.min(Math.max(next, 1), 6);
};

// ─── Factories ─────────────────────────────────────────────────────────────────

const newQAPair = (order: number): QAPair => ({
  id: uuid(),
  order,
  question: "",
  expectedAnswer: "",
  dataSourceRef: "",
});

const newUseCase = (): UseCase => ({
  id: uuid(),
  useCaseName: "",
  title: "",
  qaPairs: [newQAPair(1)],
  performer: "",
  systemsInvolved: [],
  additionalNotes: "",
  flowSteps: [],
  isCollapsed: false,
});

const newFlowStep = (order: number): FlowStep => ({
  id: uuid(),
  order,
  description: "",
  hasCalculation: false,
  calculationDetails: "",
  files: [],
  isCollapsed: false,
});

const newDataSource = (): DataSource => ({
  id: uuid(),
  name: "",
  type: "",
  description: "",
  accessMethod: "",
  files: [],
});

const newConcept = (): Concept => ({
  id: uuid(),
  term: "",
  definition: "",
  examples: "",
});

const newMetric = (): SuccessMetric => ({
  id: uuid(),
  metric: "",
  target: "",
  measurementMethod: "",
  priority: "medium",
});

// ─── Admin project hydration types ──────────────────────────────────────────────

export interface AdminProjectData {
  projectId: string;
  clientName: string;
  projectName: string;
  authorName: string;
  authorDepartment: string | null;
  authorPosition: string | null;
  agentName: string;
  agentDescription: string;
  useCases: {
    id: string;
    name: string;
    title: string | null;
    performedBy: string | null;
    systems: string[];
    notes: string | null;
    qaPairs: { id: string; order: number; question: string; expectedAnswer: string; dataSourceRef: string | null }[];
    flowSteps: { id: string; order: number; description: string; hasCalculation: boolean; calculationDetails: string | null }[];
  }[];
  dataSources: { id: string; name: string; type: string | null; description: string | null; accessMethod: string | null }[];
  concepts: { id: string; term: string; definition: string | null; examples: string | null }[];
  metrics: { id: string; name: string; target: string | null; measurementMethod: string | null; priority: string }[];
}

type FormSnapshot = {
  isLoginComplete: boolean;
  isAdminView: boolean;
  projectIntake: ProjectIntake;
  agentDetails: AgentDetails;
  currentStep: number;
  maxAccessibleStep: number;
  useCases: UseCase[];
  dataSources: DataSource[];
  concepts: Concept[];
  successMetrics: SuccessMetric[];
};

let _backup: FormSnapshot | null = null;

// ─── Store Interface ───────────────────────────────────────────────────────────

interface FormStore {
  isLoginComplete: boolean;
  isAdminView: boolean;
  projectIntake: ProjectIntake;
  agentDetails: AgentDetails;
  currentStep: number;
  maxAccessibleStep: number;
  useCases: UseCase[];
  dataSources: DataSource[];
  concepts: Concept[];
  successMetrics: SuccessMetric[];

  // Navigation
  completeLogin: () => void;
  updateProjectIntake: (patch: Partial<ProjectIntake>) => void;
  updateAgentDetails: (patch: Partial<AgentDetails>) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  resetForm: () => void;

  // Admin project hydration
  hydrateFromProject: (data: AdminProjectData) => void;
  backupState: () => void;
  restoreBackup: () => void;

  // Use Cases
  addUseCase: () => void;
  updateUseCase: (id: string, patch: Partial<UseCase>) => void;
  removeUseCase: (id: string) => void;
  toggleUseCaseCollapse: (id: string) => void;

  // QA Pairs
  addQAPair: (useCaseId: string) => void;
  updateQAPair: (useCaseId: string, qaPairId: string, patch: Partial<QAPair>) => void;
  removeQAPair: (useCaseId: string, qaPairId: string) => void;

  // Flow Steps
  addFlowStep: (useCaseId: string) => void;
  updateFlowStep: (useCaseId: string, stepId: string, patch: Partial<FlowStep>) => void;
  removeFlowStep: (useCaseId: string, stepId: string) => void;
  toggleFlowStepCollapse: (useCaseId: string, stepId: string) => void;
  reorderFlowSteps: (useCaseId: string, fromIndex: number, toIndex: number) => void;

  // Files on flow step
  addFileToStep: (useCaseId: string, stepId: string, file: FileAttachment) => void;
  updateFileInStep: (useCaseId: string, stepId: string, fileId: string, patch: Partial<FileAttachment>) => void;
  removeFileFromStep: (useCaseId: string, stepId: string, fileId: string) => void;

  // Files on data source
  addFileToDataSource: (dataSourceId: string, file: FileAttachment) => void;
  updateFileInDataSource: (dataSourceId: string, fileId: string, patch: Partial<FileAttachment>) => void;
  removeFileFromDataSource: (dataSourceId: string, fileId: string) => void;

  // Data Sources
  addDataSource: () => void;
  updateDataSource: (id: string, patch: Partial<DataSource>) => void;
  removeDataSource: (id: string) => void;

  // Concepts
  addConcept: () => void;
  updateConcept: (id: string, patch: Partial<Concept>) => void;
  removeConcept: (id: string) => void;

  // Metrics
  addSuccessMetric: () => void;
  updateSuccessMetric: (id: string, patch: Partial<SuccessMetric>) => void;
  removeSuccessMetric: (id: string) => void;

  // Output
  getOutput: () => FormOutput;
}

// ─── Store Implementation ──────────────────────────────────────────────────────

const initialFormState = {
  isLoginComplete: false,
  isAdminView: false,
  projectIntake: {
    clientName: "",
    documentAuthorName: "",
    department: "",
    position: "",
  },
  agentDetails: {
    requestedAgentName: "",
    shortAgentDescription: "",
  },
  currentStep: 1,
  maxAccessibleStep: 1,
  useCases: [],
  dataSources: [],
  concepts: [],
  successMetrics: [],
};

export const useFormStore = create<FormStore>()(
  persist(
    (set, get) => ({
  ...initialFormState,

  completeLogin: () => set({ isLoginComplete: true }),
  updateProjectIntake: (patch) =>
    set((s) => ({ projectIntake: { ...s.projectIntake, ...patch } })),
  updateAgentDetails: (patch) =>
    set((s) => ({ agentDetails: { ...s.agentDetails, ...patch } })),
  goToStep: (step) => {
    if (!get().isAdminView && lockedStepIds.has(step)) return;
    set({ currentStep: Math.min(Math.max(step, 1), 6) });
  },
  nextStep: () =>
    set((s) => {
      const next = s.isAdminView
        ? Math.min(s.currentStep + 1, 6)
        : getNextUnlockedStep(s.currentStep, 1);
      return {
        currentStep: next,
        maxAccessibleStep: Math.max(s.maxAccessibleStep, next),
      };
    }),
  prevStep: () =>
    set((s) => ({
      currentStep: s.isAdminView
        ? Math.max(s.currentStep - 1, 1)
        : getNextUnlockedStep(s.currentStep, -1),
    })),
  resetForm: () => set(initialFormState),

  backupState: () => {
    const s = get();
    _backup = {
      isLoginComplete: s.isLoginComplete,
      isAdminView: s.isAdminView,
      projectIntake: s.projectIntake,
      agentDetails: s.agentDetails,
      currentStep: s.currentStep,
      maxAccessibleStep: s.maxAccessibleStep,
      useCases: s.useCases,
      dataSources: s.dataSources,
      concepts: s.concepts,
      successMetrics: s.successMetrics,
    };
  },

  restoreBackup: () => {
    if (_backup) {
      set(_backup);
      _backup = null;
    }
  },

  hydrateFromProject: (data: AdminProjectData) => {
    set({
      isLoginComplete: true,
      isAdminView: true,
      projectIntake: {
        clientName: data.clientName,
        documentAuthorName: data.authorName,
        department: data.authorDepartment ?? "",
        position: data.authorPosition ?? "",
      },
      agentDetails: {
        requestedAgentName: data.agentName,
        shortAgentDescription: data.agentDescription,
      },
      currentStep: 1,
      maxAccessibleStep: 6,
      useCases: data.useCases.map((uc) => ({
        id: uc.id,
        useCaseName: uc.name,
        title: uc.title ?? "",
        performer: uc.performedBy ?? "",
        systemsInvolved: uc.systems,
        additionalNotes: uc.notes ?? "",
        isCollapsed: false,
        qaPairs: uc.qaPairs.map((qa) => ({
          id: qa.id,
          order: qa.order,
          question: qa.question,
          expectedAnswer: qa.expectedAnswer,
          dataSourceRef: qa.dataSourceRef ?? "",
        })),
        flowSteps: uc.flowSteps.map((fs) => ({
          id: fs.id,
          order: fs.order,
          description: fs.description,
          hasCalculation: fs.hasCalculation,
          calculationDetails: fs.calculationDetails ?? "",
          files: [],
          isCollapsed: false,
        })),
      })),
      dataSources: data.dataSources.map((ds) => ({
        id: ds.id,
        name: ds.name,
        type: ds.type ?? "",
        description: ds.description ?? "",
        accessMethod: ds.accessMethod ?? "",
        files: [],
      })),
      concepts: data.concepts.map((c) => ({
        id: c.id,
        term: c.term,
        definition: c.definition ?? "",
        examples: c.examples ?? "",
      })),
      successMetrics: data.metrics.map((m) => ({
        id: m.id,
        metric: m.name,
        target: m.target ?? "",
        measurementMethod: m.measurementMethod ?? "",
        priority: (m.priority as "high" | "medium" | "low") || "medium",
      })),
    });
  },

  // ── Use Cases ────────────────────────────────────────────────────────────────

  addUseCase: () =>
    set((s) => ({ useCases: [...s.useCases, newUseCase()] })),

  updateUseCase: (id, patch) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => (uc.id === id ? { ...uc, ...patch } : uc)),
    })),

  removeUseCase: (id) =>
    set((s) => ({ useCases: s.useCases.filter((uc) => uc.id !== id) })),

  toggleUseCaseCollapse: (id) =>
    set((s) => ({
      useCases: s.useCases.map((uc) =>
        uc.id === id ? { ...uc, isCollapsed: !uc.isCollapsed } : uc
      ),
    })),

  // ── QA Pairs ────────────────────────────────────────────────────────────────

  addQAPair: (useCaseId) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => {
        if (uc.id !== useCaseId) return uc;
        return {
          ...uc,
          qaPairs: [...uc.qaPairs, newQAPair(uc.qaPairs.length + 1)],
        };
      }),
    })),

  updateQAPair: (useCaseId, qaPairId, patch) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => {
        if (uc.id !== useCaseId) return uc;
        return {
          ...uc,
          qaPairs: uc.qaPairs.map((pair) =>
            pair.id === qaPairId ? { ...pair, ...patch } : pair
          ),
        };
      }),
    })),

  removeQAPair: (useCaseId, qaPairId) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => {
        if (uc.id !== useCaseId) return uc;
        const filtered = uc.qaPairs.filter((pair) => pair.id !== qaPairId);
        return {
          ...uc,
          qaPairs: filtered.map((pair, i) => ({ ...pair, order: i + 1 })),
        };
      }),
    })),

  // ── Flow Steps ───────────────────────────────────────────────────────────────

  addFlowStep: (useCaseId) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => {
        if (uc.id !== useCaseId) return uc;
        return {
          ...uc,
          flowSteps: [...uc.flowSteps, newFlowStep(uc.flowSteps.length + 1)],
        };
      }),
    })),

  updateFlowStep: (useCaseId, stepId, patch) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => {
        if (uc.id !== useCaseId) return uc;
        return {
          ...uc,
          flowSteps: uc.flowSteps.map((step) =>
            step.id === stepId ? { ...step, ...patch } : step
          ),
        };
      }),
    })),

  removeFlowStep: (useCaseId, stepId) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => {
        if (uc.id !== useCaseId) return uc;
        const filtered = uc.flowSteps.filter((step) => step.id !== stepId);
        return {
          ...uc,
          flowSteps: filtered.map((step, i) => ({ ...step, order: i + 1 })),
        };
      }),
    })),

  toggleFlowStepCollapse: (useCaseId, stepId) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => {
        if (uc.id !== useCaseId) return uc;
        return {
          ...uc,
          flowSteps: uc.flowSteps.map((step) =>
            step.id === stepId ? { ...step, isCollapsed: !step.isCollapsed } : step
          ),
        };
      }),
    })),

  reorderFlowSteps: (useCaseId, fromIndex, toIndex) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => {
        if (uc.id !== useCaseId) return uc;
        const steps = [...uc.flowSteps];
        const [moved] = steps.splice(fromIndex, 1);
        steps.splice(toIndex, 0, moved);
        return {
          ...uc,
          flowSteps: steps.map((step, i) => ({ ...step, order: i + 1 })),
        };
      }),
    })),

  // ── Files ────────────────────────────────────────────────────────────────────

  addFileToStep: (useCaseId, stepId, file) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => {
        if (uc.id !== useCaseId) return uc;
        return {
          ...uc,
          flowSteps: uc.flowSteps.map((step) =>
            step.id === stepId
              ? { ...step, files: [...step.files, file] }
              : step
          ),
        };
      }),
    })),

  updateFileInStep: (useCaseId, stepId, fileId, patch) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => {
        if (uc.id !== useCaseId) return uc;
        return {
          ...uc,
          flowSteps: uc.flowSteps.map((step) =>
            step.id === stepId
              ? { ...step, files: step.files.map((f) => (f.id === fileId ? { ...f, ...patch } : f)) }
              : step
          ),
        };
      }),
    })),

  removeFileFromStep: (useCaseId, stepId, fileId) =>
    set((s) => ({
      useCases: s.useCases.map((uc) => {
        if (uc.id !== useCaseId) return uc;
        return {
          ...uc,
          flowSteps: uc.flowSteps.map((step) =>
            step.id === stepId
              ? { ...step, files: step.files.filter((f) => f.id !== fileId) }
              : step
          ),
        };
      }),
    })),

  // ── Files on Data Sources ──────────────────────────────────────────────────────

  addFileToDataSource: (dataSourceId, file) =>
    set((s) => ({
      dataSources: s.dataSources.map((ds) =>
        ds.id === dataSourceId ? { ...ds, files: [...ds.files, file] } : ds
      ),
    })),

  updateFileInDataSource: (dataSourceId, fileId, patch) =>
    set((s) => ({
      dataSources: s.dataSources.map((ds) =>
        ds.id === dataSourceId
          ? { ...ds, files: ds.files.map((f) => (f.id === fileId ? { ...f, ...patch } : f)) }
          : ds
      ),
    })),

  removeFileFromDataSource: (dataSourceId, fileId) =>
    set((s) => ({
      dataSources: s.dataSources.map((ds) =>
        ds.id === dataSourceId
          ? { ...ds, files: ds.files.filter((f) => f.id !== fileId) }
          : ds
      ),
    })),

  // ── Data Sources ─────────────────────────────────────────────────────────────

  addDataSource: () =>
    set((s) => ({ dataSources: [...s.dataSources, newDataSource()] })),

  updateDataSource: (id, patch) =>
    set((s) => ({
      dataSources: s.dataSources.map((ds) => (ds.id === id ? { ...ds, ...patch } : ds)),
    })),

  removeDataSource: (id) =>
    set((s) => ({ dataSources: s.dataSources.filter((ds) => ds.id !== id) })),

  // ── Concepts ─────────────────────────────────────────────────────────────────

  addConcept: () =>
    set((s) => ({ concepts: [...s.concepts, newConcept()] })),

  updateConcept: (id, patch) =>
    set((s) => ({
      concepts: s.concepts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    })),

  removeConcept: (id) =>
    set((s) => ({ concepts: s.concepts.filter((c) => c.id !== id) })),

  // ── Metrics ──────────────────────────────────────────────────────────────────

  addSuccessMetric: () =>
    set((s) => ({ successMetrics: [...s.successMetrics, newMetric()] })),

  updateSuccessMetric: (id, patch) =>
    set((s) => ({
      successMetrics: s.successMetrics.map((m) =>
        m.id === id ? { ...m, ...patch } : m
      ),
    })),

  removeSuccessMetric: (id) =>
    set((s) => ({
      successMetrics: s.successMetrics.filter((m) => m.id !== id),
    })),

  // ── Output ───────────────────────────────────────────────────────────────────

  getOutput: () => {
    const { projectIntake, agentDetails, useCases, dataSources, concepts, successMetrics } = get();

    const uploadedFiles: UploadedFileRef[] = [];
    for (const uc of useCases) {
      for (const step of uc.flowSteps) {
        for (const f of step.files) {
          if (f.uploadStatus === "uploaded" && f.fileId && f.blobPath) {
            uploadedFiles.push({
              fileId: f.fileId,
              blobPath: f.blobPath,
              originalFileName: f.name,
              mimeType: f.mimeType || "",
              size: f.size,
              stepId: `usecase-${uc.id}-step-${step.order}`,
              fieldName: "flowStepScreenshot",
            });
          }
        }
      }
    }
    for (const ds of dataSources) {
      for (const f of ds.files) {
        if (f.uploadStatus === "uploaded" && f.fileId && f.blobPath) {
          uploadedFiles.push({
            fileId: f.fileId,
            blobPath: f.blobPath,
            originalFileName: f.name,
            mimeType: f.mimeType || "",
            size: f.size,
            stepId: `datasource-${ds.id}`,
            fieldName: "dataSourceFile",
          });
        }
      }
    }

    return {
      projectIntake,
      agentDetails,
      useCases,
      dataSources,
      concepts,
      successMetrics,
      submittedAt: new Date().toISOString(),
      uploadedFiles,
    };
  },
    }),
    {
      name: "agent-specs-form-draft",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isLoginComplete: state.isLoginComplete,
        projectIntake: state.projectIntake,
        agentDetails: state.agentDetails,
        currentStep: state.currentStep,
        maxAccessibleStep: state.maxAccessibleStep,
        useCases: state.useCases,
        dataSources: state.dataSources,
        concepts: state.concepts,
        successMetrics: state.successMetrics,
      }),
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version < 2) {
          const useCases = (state.useCases as Array<Record<string, unknown>>) ?? [];
          state.useCases = useCases.map((uc) => {
            if (!uc.qaPairs) {
              const question = (uc.userQuestion as string) || "";
              const answer = (uc.expectedAnswer as string) || "";
              uc.qaPairs = question || answer
                ? [{ id: uuid(), order: 1, question, expectedAnswer: answer, dataSourceRef: "" }]
                : [{ id: uuid(), order: 1, question: "", expectedAnswer: "", dataSourceRef: "" }];
              delete uc.userQuestion;
              delete uc.expectedAnswer;
            }
            return uc;
          });
        }
        return state as unknown as FormStore;
      },
    }
  )
);
