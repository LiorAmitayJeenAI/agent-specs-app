import type {
  AgentDetails,
  Concept,
  DataSource,
  ProjectIntake,
  SuccessMetric,
  UseCase,
} from "@/types";
import type { PrdDocumentSource } from "@/lib/prdDocument";
import type {
  LlmDraftSectionKey,
  LlmDraftSections,
  LlmDraftUseCase,
} from "@/types/llmDraft";

export interface LlmDraftFormSlice {
  projectIntake?: ProjectIntake;
  agentDetails: AgentDetails;
  useCases: UseCase[];
  dataSources: DataSource[];
  concepts: Concept[];
  successMetrics: SuccessMetric[];
}

export interface LlmDraftStoreUpdaters {
  updateAgentDetails: (patch: Partial<AgentDetails>) => void;
  updateUseCase: (id: string, patch: Partial<UseCase>) => void;
  updateQAPair: (
    useCaseId: string,
    qaId: string,
    patch: Partial<{ question: string; expectedAnswer: string; dataSourceRef: string }>
  ) => void;
  updateFlowStep: (
    useCaseId: string,
    stepId: string,
    patch: Partial<UseCase["flowSteps"][number]>
  ) => void;
  updateDataSource: (id: string, patch: Partial<DataSource>) => void;
  updateConcept: (id: string, patch: Partial<Concept>) => void;
  updateSuccessMetric: (id: string, patch: Partial<SuccessMetric>) => void;
}

export function buildLlmDraftPayload(slice: LlmDraftFormSlice): LlmDraftSections {
  return {
    protected: {
      clientName: slice.projectIntake?.clientName ?? "",
      documentAuthorName: slice.projectIntake?.documentAuthorName ?? "",
      agentName: slice.agentDetails.requestedAgentName,
    },
    general: {
      shortAgentDescription: slice.agentDetails.shortAgentDescription,
    },
    useCases: slice.useCases.map((uc) => ({
      id: uc.id,
      useCaseName: uc.useCaseName,
      title: uc.title,
      performer: uc.performer,
      systemsInvolved: uc.systemsInvolved,
      additionalNotes: uc.additionalNotes,
      qaPairs: (uc.qaPairs ?? []).map((qa) => ({
        id: qa.id,
        question: qa.question,
        expectedAnswer: qa.expectedAnswer,
        dataSourceRef: qa.dataSourceRef,
      })),
      flowSteps: uc.flowSteps.map((step) => ({
        id: step.id,
        order: step.order,
        description: step.description,
        hasCalculation: step.hasCalculation,
        calculationDetails: step.calculationDetails,
        files: step.files.map((file) => ({
          id: file.id,
          name: file.name,
          kind: file.kind,
          uploadStatus: file.uploadStatus,
        })),
      })),
    })),
    dataSources: slice.dataSources.map((ds) => ({
      id: ds.id,
      name: ds.name,
      type: ds.type,
      description: ds.description,
      accessMethod: ds.accessMethod,
      files: ds.files.map((file) => ({
        id: file.id,
        name: file.name,
        kind: file.kind,
        uploadStatus: file.uploadStatus,
      })),
    })),
    concepts: slice.concepts.map((c) => ({
      id: c.id,
      term: c.term,
      definition: c.definition,
      examples: c.examples,
    })),
    metrics: slice.successMetrics.map((m) => ({
      id: m.id,
      metric: m.metric,
      target: m.target,
      measurementMethod: m.measurementMethod,
    })),
  };
}

export function createLlmDraftSourceHash(sections: LlmDraftSections): string {
  return JSON.stringify(sections);
}

export function createLlmDraftEditableHash(sections: LlmDraftSections): string {
  const { protected: _protected, ...editableSections } = sections;
  return JSON.stringify(editableSections);
}

export function listLlmDraftSectionKeys(sections: LlmDraftSections): LlmDraftSectionKey[] {
  const keys: LlmDraftSectionKey[] = ["fullDocument", "general"];
  for (const uc of sections.useCases) {
    keys.push(`useCase:${uc.id}`);
  }
  if (sections.dataSources.length > 0) keys.push("dataSources");
  if (sections.concepts.length > 0) keys.push("concepts");
  if (sections.metrics.length > 0) keys.push("metrics");
  return keys;
}

export function getLlmDraftSectionLabel(
  key: LlmDraftSectionKey,
  sections: LlmDraftSections
): string {
  if (key === "fullDocument") return "מסמך מלא";
  if (key === "general") return "תיאור כללי";
  if (key === "dataSources") return "מקורות מידע";
  if (key === "concepts") return "מושגים והגדרות";
  if (key === "metrics") return "מדדי הצלחה";
  const useCaseId = key.replace("useCase:", "");
  const index = sections.useCases.findIndex((uc) => uc.id === useCaseId);
  const uc = sections.useCases[index];
  const name = uc?.useCaseName || uc?.title || `תרחיש ${index + 1}`;
  return `תרחיש ${index + 1}: ${name}`;
}

function applyUseCaseSection(
  updaters: LlmDraftStoreUpdaters,
  proposed: LlmDraftUseCase
) {
  updaters.updateUseCase(proposed.id, {
    title: proposed.title,
    performer: proposed.performer,
    systemsInvolved: proposed.systemsInvolved,
    additionalNotes: proposed.additionalNotes,
  });
  for (const qa of proposed.qaPairs) {
    updaters.updateQAPair(proposed.id, qa.id, {
      question: qa.question,
      expectedAnswer: qa.expectedAnswer,
      dataSourceRef: qa.dataSourceRef,
    });
  }
  for (const step of proposed.flowSteps) {
    updaters.updateFlowStep(proposed.id, step.id, {
      description: step.description,
      calculationDetails: step.calculationDetails,
    });
  }
}

export function applyLlmDraftSections(
  updaters: LlmDraftStoreUpdaters,
  proposed: LlmDraftSections,
  acceptedKeys: Set<LlmDraftSectionKey>
) {
  if (acceptedKeys.has("fullDocument") || acceptedKeys.has("general")) {
    updaters.updateAgentDetails({
      shortAgentDescription: proposed.general.shortAgentDescription,
    });
  }

  for (const uc of proposed.useCases) {
    if (acceptedKeys.has("fullDocument") || acceptedKeys.has(`useCase:${uc.id}`)) {
      applyUseCaseSection(updaters, uc);
    }
  }

  if (acceptedKeys.has("fullDocument") || acceptedKeys.has("dataSources")) {
    for (const ds of proposed.dataSources) {
      updaters.updateDataSource(ds.id, {
        description: ds.description,
        accessMethod: ds.accessMethod,
      });
    }
  }

  if (acceptedKeys.has("fullDocument") || acceptedKeys.has("concepts")) {
    for (const concept of proposed.concepts) {
      updaters.updateConcept(concept.id, {
        definition: concept.definition,
        examples: concept.examples,
      });
    }
  }

  if (acceptedKeys.has("fullDocument") || acceptedKeys.has("metrics")) {
    for (const metric of proposed.metrics) {
      updaters.updateSuccessMetric(metric.id, {
        target: metric.target,
        measurementMethod: metric.measurementMethod,
      });
    }
  }
}

export function mergeLlmDraftIntoPrdSource(
  source: PrdDocumentSource,
  draft: LlmDraftSections
): PrdDocumentSource {
  return {
    ...source,
    agentDetails: {
      ...source.agentDetails,
      shortAgentDescription: draft.general.shortAgentDescription,
    },
    useCases: source.useCases.map((useCase) => {
      const next = draft.useCases.find((item) => item.id === useCase.id);
      if (!next) return useCase;

      return {
        ...useCase,
        title: next.title,
        performer: next.performer,
        systemsInvolved: next.systemsInvolved,
        additionalNotes: next.additionalNotes,
        qaPairs: useCase.qaPairs.map((qaPair) => {
          const qaNext = next.qaPairs.find((item) => item.id === qaPair.id);
          return qaNext
            ? {
                ...qaPair,
                question: qaNext.question,
                expectedAnswer: qaNext.expectedAnswer,
                dataSourceRef: qaNext.dataSourceRef,
              }
            : qaPair;
        }),
        flowSteps: useCase.flowSteps.map((flowStep) => {
          const stepNext = next.flowSteps.find((item) => item.id === flowStep.id);
          return stepNext
            ? {
                ...flowStep,
                description: stepNext.description,
                calculationDetails: stepNext.calculationDetails,
              }
            : flowStep;
        }),
      };
    }),
    dataSources: source.dataSources.map((dataSource) => {
      const next = draft.dataSources.find((item) => item.id === dataSource.id);
      return next
        ? {
            ...dataSource,
            description: next.description,
            accessMethod: next.accessMethod,
          }
        : dataSource;
    }),
    concepts: source.concepts.map((concept) => {
      const next = draft.concepts.find((item) => item.id === concept.id);
      return next
        ? {
            ...concept,
            definition: next.definition,
            examples: next.examples,
          }
        : concept;
    }),
    successMetrics: source.successMetrics.map((metric) => {
      const next = draft.metrics.find((item) => item.id === metric.id);
      return next
        ? {
            ...metric,
            target: next.target,
            measurementMethod: next.measurementMethod,
          }
        : metric;
    }),
  };
}

export function mergeDraftSnapshotIntoPrdSource(
  source: PrdDocumentSource,
  snapshot: LlmDraftSections
): PrdDocumentSource {
  return mergeLlmDraftIntoPrdSource(source, snapshot);
}

export function getPendingLlmDraftSectionKeys(
  original: LlmDraftSections,
  firstProposed: LlmDraftSections,
  appliedKeys: Set<LlmDraftSectionKey>
): LlmDraftSectionKey[] {
  return listLlmDraftSectionKeys(original)
    .filter((key) => !appliedKeys.has(key))
    .filter((key) => sectionHasChanges(key, original, firstProposed));
}

export function sectionHasChanges(
  key: LlmDraftSectionKey,
  original: LlmDraftSections,
  proposed: LlmDraftSections
): boolean {
  if (key === "fullDocument") {
    return listLlmDraftSectionKeys(original)
      .filter((sectionKey) => sectionKey !== "fullDocument")
      .some((sectionKey) => sectionHasChanges(sectionKey, original, proposed));
  }

  if (key === "general") {
    return (
      original.general.shortAgentDescription.trim() !==
      proposed.general.shortAgentDescription.trim()
    );
  }

  if (key === "dataSources") {
    if (original.dataSources.length !== proposed.dataSources.length) return true;
    return original.dataSources.some((ds, i) => {
      const next = proposed.dataSources[i];
      if (!next || ds.id !== next.id) return true;
      return (
        ds.description.trim() !== next.description.trim() ||
        ds.accessMethod.trim() !== next.accessMethod.trim()
      );
    });
  }

  if (key === "concepts") {
    if (original.concepts.length !== proposed.concepts.length) return true;
    return original.concepts.some((c, i) => {
      const next = proposed.concepts[i];
      if (!next || c.id !== next.id) return true;
      return (
        c.definition.trim() !== next.definition.trim() ||
        c.examples.trim() !== next.examples.trim()
      );
    });
  }

  if (key === "metrics") {
    if (original.metrics.length !== proposed.metrics.length) return true;
    return original.metrics.some((m, i) => {
      const next = proposed.metrics[i];
      if (!next || m.id !== next.id) return true;
      return (
        m.target.trim() !== next.target.trim() ||
        m.measurementMethod.trim() !== next.measurementMethod.trim()
      );
    });
  }

  const useCaseId = key.replace("useCase:", "");
  const orig = original.useCases.find((uc) => uc.id === useCaseId);
  const next = proposed.useCases.find((uc) => uc.id === useCaseId);
  if (!orig || !next) return false;

  if (
    orig.title.trim() !== next.title.trim() ||
    orig.performer.trim() !== next.performer.trim() ||
    orig.systemsInvolved.join("\n").trim() !== next.systemsInvolved.join("\n").trim() ||
    orig.additionalNotes.trim() !== next.additionalNotes.trim()
  ) {
    return true;
  }

  if (orig.qaPairs.length !== next.qaPairs.length) return true;
  if (
    orig.qaPairs.some((qa, i) => {
    const qaNext = next.qaPairs[i];
    if (!qaNext || qa.id !== qaNext.id) return true;
    return (
      qa.question.trim() !== qaNext.question.trim() ||
      qa.expectedAnswer.trim() !== qaNext.expectedAnswer.trim() ||
      qa.dataSourceRef.trim() !== qaNext.dataSourceRef.trim()
    );
    })
  ) {
    return true;
  }

  if (orig.flowSteps.length !== next.flowSteps.length) return true;
  return orig.flowSteps.some((step, i) => {
    const stepNext = next.flowSteps[i];
    if (!stepNext || step.id !== stepNext.id) return true;
    return (
      step.description.trim() !== stepNext.description.trim() ||
      step.calculationDetails.trim() !== stepNext.calculationDetails.trim()
    );
  });
}