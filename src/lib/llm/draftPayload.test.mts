import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyLlmDraftSections,
  buildLlmDraftPayload,
  createLlmDraftEditableHash,
  createLlmDraftSourceHash,
  mergeDraftSnapshotIntoPrdSource,
  sectionHasChanges,
} from "./draftPayload.ts";
import type { LlmDraftFormSlice, LlmDraftStoreUpdaters } from "./draftPayload.ts";
import type { PrdDocumentSource } from "../prdDocument.ts";
import type { AgentDetails, Concept, DataSource, SuccessMetric, UseCase } from "../../types/index.ts";

const slice: LlmDraftFormSlice = {
  agentDetails: {
    requestedAgentName: "סוכן שירות",
    shortAgentDescription: "עונה ללקוחות",
  },
  useCases: [
    {
      id: "uc-1",
      useCaseName: "בירור סטטוס",
      title: "לקוח מבקש סטטוס תביעה",
      performer: "נציג שירות",
      systemsInvolved: ["CRM"],
      additionalNotes: "לתעד את השיחה",
      isCollapsed: false,
      qaPairs: [
        {
          id: "qa-1",
          order: 1,
          question: "מה מצב התביעה?",
          expectedAnswer: "התביעה בטיפול",
          dataSourceRef: "מערכת תביעות",
        },
      ],
      flowSteps: [
        {
          id: "step-1",
          order: 1,
          description: "נכנסים למערכת התביעות",
          hasCalculation: true,
          calculationDetails: "סופרים ימי טיפול",
          files: [
            {
              id: "file-1",
              name: "claim.png",
              url: "/claim.png",
              kind: "image",
              size: 100,
              uploadStatus: "uploaded",
            },
          ],
          isCollapsed: false,
        },
      ],
    },
  ],
  dataSources: [
    {
      id: "ds-1",
      name: "מערכת תביעות",
      type: "API חיצוני",
      description: "מידע תביעות",
      accessMethod: "API",
      files: [],
    },
  ],
  concepts: [
    {
      id: "concept-1",
      term: "תביעה",
      definition: "בקשת החזר",
      examples: "תביעת רכב",
    },
  ],
  successMetrics: [
    {
      id: "metric-1",
      metric: "דיוק",
      target: "90%",
      measurementMethod: "בדיקה ידנית",
      priority: "medium",
    },
  ],
};

test("builds a full PRD LLM payload while preserving protected identity and attachments", () => {
  const payload = buildLlmDraftPayload(slice);

  assert.equal(payload.protected.agentName, "סוכן שירות");
  assert.equal(payload.general.shortAgentDescription, "עונה ללקוחות");
  assert.equal(payload.useCases[0]?.flowSteps[0]?.description, "נכנסים למערכת התביעות");
  assert.equal(payload.useCases[0]?.flowSteps[0]?.calculationDetails, "סופרים ימי טיפול");
  assert.deepEqual(payload.useCases[0]?.flowSteps[0]?.files, [
    {
      id: "file-1",
      name: "claim.png",
      kind: "image",
      uploadStatus: "uploaded",
    },
  ]);
  assert.equal(payload.dataSources[0]?.type, "API חיצוני");
  assert.equal(payload.dataSources[0]?.accessMethod, "API");
});

test("applies full PRD LLM text without changing protected names or attachments", () => {
  const proposed = buildLlmDraftPayload(slice);
  proposed.protected.agentName = "שם שאסור להחיל";
  proposed.general.shortAgentDescription = "תיאור משופר";
  proposed.useCases[0]!.useCaseName = "שם שאסור להחיל";
  proposed.useCases[0]!.title = "תיאור תרחיש משופר";
  proposed.useCases[0]!.performer = "מבצע משופר";
  proposed.useCases[0]!.systemsInvolved = ["CRM", "מערכת תביעות"];
  proposed.useCases[0]!.additionalNotes = "הערות משופרות";
  proposed.useCases[0]!.qaPairs[0]!.question = "שאלה משופרת?";
  proposed.useCases[0]!.qaPairs[0]!.expectedAnswer = "תשובה משופרת";
  proposed.useCases[0]!.qaPairs[0]!.dataSourceRef = "מקור משופר";
  proposed.useCases[0]!.flowSteps[0]!.description = "שלב משופר";
  proposed.useCases[0]!.flowSteps[0]!.calculationDetails = "חישוב משופר";
  proposed.dataSources[0]!.name = "שם מקור שאסור להחיל";
  proposed.dataSources[0]!.type = "סוג שאסור להחיל";
  proposed.dataSources[0]!.description = "תיאור מקור משופר";
  proposed.dataSources[0]!.accessMethod = "גישה משופרת";
  proposed.concepts[0]!.term = "מונח שאסור להחיל";
  proposed.concepts[0]!.definition = "הגדרה משופרת";
  proposed.concepts[0]!.examples = "דוגמה משופרת";
  proposed.metrics[0]!.metric = "מדד שאסור להחיל";
  proposed.metrics[0]!.target = "95%";
  proposed.metrics[0]!.measurementMethod = "מדידה אוטומטית";

  const calls: Array<[string, string, unknown]> = [];
  const updaters: LlmDraftStoreUpdaters = {
    updateAgentDetails: (patch: Partial<AgentDetails>) => calls.push(["agent", "root", patch]),
    updateUseCase: (id: string, patch: Partial<UseCase>) => calls.push(["useCase", id, patch]),
    updateQAPair: (useCaseId: string, qaId: string, patch) =>
      calls.push(["qa", `${useCaseId}:${qaId}`, patch]),
    updateFlowStep: (useCaseId: string, stepId: string, patch) =>
      calls.push(["flowStep", `${useCaseId}:${stepId}`, patch]),
    updateDataSource: (id: string, patch: Partial<DataSource>) => calls.push(["dataSource", id, patch]),
    updateConcept: (id: string, patch: Partial<Concept>) => calls.push(["concept", id, patch]),
    updateSuccessMetric: (id: string, patch: Partial<SuccessMetric>) =>
      calls.push(["metric", id, patch]),
  };

  applyLlmDraftSections(updaters, proposed, new Set(["fullDocument"]));

  assert.deepEqual(calls, [
    ["agent", "root", { shortAgentDescription: "תיאור משופר" }],
    [
      "useCase",
      "uc-1",
      {
        title: "תיאור תרחיש משופר",
        performer: "מבצע משופר",
        systemsInvolved: ["CRM", "מערכת תביעות"],
        additionalNotes: "הערות משופרות",
      },
    ],
    [
      "qa",
      "uc-1:qa-1",
      {
        question: "שאלה משופרת?",
        expectedAnswer: "תשובה משופרת",
        dataSourceRef: "מקור משופר",
      },
    ],
    [
      "flowStep",
      "uc-1:step-1",
      {
        description: "שלב משופר",
        calculationDetails: "חישוב משופר",
      },
    ],
    ["dataSource", "ds-1", { description: "תיאור מקור משופר", accessMethod: "גישה משופרת" }],
    ["concept", "concept-1", { definition: "הגדרה משופרת", examples: "דוגמה משופרת" }],
    ["metric", "metric-1", { target: "95%", measurementMethod: "מדידה אוטומטית" }],
  ]);
});

test("merges LLM draft snapshots without overwriting protected structural fields", () => {
  const source: PrdDocumentSource = {
    projectIntake: {
      clientName: "לקוח מקורי",
      documentAuthorName: "עורך מקורי",
      department: "",
      position: "",
    },
    agentDetails: slice.agentDetails,
    useCases: slice.useCases,
    dataSources: slice.dataSources,
    concepts: slice.concepts,
    successMetrics: slice.successMetrics,
  };
  const draft = buildLlmDraftPayload(slice);

  draft.protected.clientName = "לקוח שאסור להחיל";
  draft.protected.documentAuthorName = "עורך שאסור להחיל";
  draft.protected.agentName = "סוכן שאסור להחיל";
  draft.general.shortAgentDescription = "תיאור משופר";
  draft.useCases[0]!.useCaseName = "תרחיש שאסור להחיל";
  draft.useCases[0]!.title = "תיאור תרחיש משופר";
  draft.dataSources[0]!.name = "מקור שאסור להחיל";
  draft.dataSources[0]!.type = "סוג שאסור להחיל";
  draft.dataSources[0]!.description = "תיאור מקור משופר";
  draft.concepts[0]!.term = "מונח שאסור להחיל";
  draft.concepts[0]!.definition = "הגדרה משופרת";
  draft.metrics[0]!.metric = "מדד שאסור להחיל";
  draft.metrics[0]!.target = "95%";

  const merged = mergeDraftSnapshotIntoPrdSource(source, draft);

  assert.equal(merged.projectIntake.clientName, "לקוח מקורי");
  assert.equal(merged.projectIntake.documentAuthorName, "עורך מקורי");
  assert.equal(merged.agentDetails.requestedAgentName, "סוכן שירות");
  assert.equal(merged.agentDetails.shortAgentDescription, "תיאור משופר");
  assert.equal(merged.useCases[0]?.useCaseName, "בירור סטטוס");
  assert.equal(merged.useCases[0]?.title, "תיאור תרחיש משופר");
  assert.equal(merged.dataSources[0]?.name, "מערכת תביעות");
  assert.equal(merged.dataSources[0]?.type, "API חיצוני");
  assert.equal(merged.dataSources[0]?.description, "תיאור מקור משופר");
  assert.equal(merged.concepts[0]?.term, "תביעה");
  assert.equal(merged.concepts[0]?.definition, "הגדרה משופרת");
  assert.equal(merged.successMetrics[0]?.metric, "דיוק");
  assert.equal(merged.successMetrics[0]?.target, "95%");
});

test("changes the source hash when full PRD text changes", () => {
  const firstHash = createLlmDraftSourceHash(buildLlmDraftPayload(slice));
  const changed = {
    ...slice,
    useCases: [
      {
        ...slice.useCases[0]!,
        flowSteps: [
          {
            ...slice.useCases[0]!.flowSteps[0]!,
            description: "טקסט חדש",
          },
        ],
      },
    ],
  };

  const nextHash = createLlmDraftSourceHash(buildLlmDraftPayload(changed));

  assert.notEqual(firstHash, nextHash);
});

test("detects appended proposed items in collection sections", () => {
  const original = buildLlmDraftPayload(slice);

  assert.equal(
    sectionHasChanges("dataSources", original, {
      ...original,
      dataSources: [
        ...original.dataSources,
        {
          ...original.dataSources[0]!,
          id: "ds-2",
          name: "מערכת נוספת",
        },
      ],
    }),
    true
  );

  assert.equal(
    sectionHasChanges("concepts", original, {
      ...original,
      concepts: [
        ...original.concepts,
        {
          ...original.concepts[0]!,
          id: "concept-2",
          term: "מונח נוסף",
        },
      ],
    }),
    true
  );

  assert.equal(
    sectionHasChanges("metrics", original, {
      ...original,
      metrics: [
        ...original.metrics,
        {
          ...original.metrics[0]!,
          id: "metric-2",
          metric: "מדד נוסף",
        },
      ],
    }),
    true
  );
});

test("detects data source changes only in LLM-editable fields", () => {
  const original = buildLlmDraftPayload(slice);

  assert.equal(
    sectionHasChanges("dataSources", original, {
      ...original,
      dataSources: [
        {
          ...original.dataSources[0]!,
          name: "שם מקור שאסור להחיל",
          type: "סוג שאסור להחיל",
        },
      ],
    }),
    false
  );

  assert.equal(
    sectionHasChanges("dataSources", original, {
      ...original,
      dataSources: [
        {
          ...original.dataSources[0]!,
          accessMethod: "גישה משופרת",
        },
      ],
    }),
    true
  );
});

test("keeps the AI-editable hash stable when only protected fields change", () => {
  const basePayload = buildLlmDraftPayload(slice);
  const changedProtected = {
    ...basePayload,
    protected: {
      clientName: "לקוח חדש",
      documentAuthorName: "עורך חדש",
      agentName: "סוכן חדש",
    },
  };

  assert.equal(
    createLlmDraftEditableHash(basePayload),
    createLlmDraftEditableHash(changedProtected)
  );
});

test("changes the AI-editable hash when LLM-editable fields change", () => {
  const basePayload = buildLlmDraftPayload(slice);
  const changedEditable = {
    ...basePayload,
    general: {
      shortAgentDescription: "תיאור חדש שה-AI צריך לעבד",
    },
  };

  assert.notEqual(
    createLlmDraftEditableHash(basePayload),
    createLlmDraftEditableHash(changedEditable)
  );
});
