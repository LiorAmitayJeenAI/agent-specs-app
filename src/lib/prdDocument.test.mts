import assert from "node:assert/strict";
import { test } from "node:test";

import { buildPrdDocumentBlocks } from "./prdDocument.ts";
import type { PrdDocumentSource } from "./prdDocument.ts";

const source: PrdDocumentSource = {
  projectIntake: {
    clientName: "ביטוח ישיר",
    documentAuthorName: "דנה",
    department: "",
    position: "",
  },
  agentDetails: {
    requestedAgentName: "סוכן שירות",
    shortAgentDescription: "עונה ללקוחות",
  },
  useCases: [
    {
      id: "uc-1",
      useCaseName: "מענה לפנייה",
      title: "לקוח שואל על סטטוס תביעה",
      performer: "נציג שירות",
      systemsInvolved: ["CRM", "מערכת תביעות"],
      additionalNotes: "צריך תשובה מהירה",
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
          description: "בדיקת פרטי לקוח",
          hasCalculation: true,
          calculationDetails: "חישוב ימי טיפול",
          isCollapsed: false,
          files: [
            {
              id: "file-1",
              name: "screen.png",
              url: "/file-proxy/screen.png",
              kind: "image",
              size: 100,
              uploadStatus: "uploaded",
              preview: "data:image/png;base64,abc",
            },
          ],
        },
      ],
    },
  ],
  dataSources: [
    {
      id: "ds-1",
      name: "מערכת תביעות",
      type: "API חיצוני",
      description: "מידע על סטטוס תביעה",
      accessMethod: "API",
      files: [],
    },
  ],
  concepts: [
    {
      id: "concept-1",
      term: "תביעה פתוחה",
      definition: "תביעה שעדיין בטיפול",
      examples: "תביעה ממתינה למסמך",
    },
  ],
  successMetrics: [
    {
      id: "metric-1",
      metric: "זמן תגובה",
      target: "עד 30 שניות",
      measurementMethod: "מדידה במערכת",
      priority: "high",
    },
  ],
};

test("builds reusable PRD document blocks including full flow and attachment context", () => {
  const blocks = buildPrdDocumentBlocks(source, { editable: false });

  assert.ok(blocks.some((block) => block.kind === "heading" && block.text === "שם הלקוח"));
  assert.ok(blocks.some((block) => block.kind === "paragraph" && block.text === "ביטוח ישיר"));
  assert.ok(blocks.some((block) => block.kind === "paragraph" && block.text === "בדיקת פרטי לקוח"));
  assert.ok(blocks.some((block) => block.kind === "paragraph" && block.text === "חישוב ימי טיפול"));
  assert.ok(blocks.some((block) => block.kind === "imageRef" && block.preview === "data:image/png;base64,abc"));
  assert.ok(blocks.some((block) => block.kind === "paragraph" && block.text === "API חיצוני"));
});

test("renders client name as read-only when requested even in editable documents", () => {
  const blocks = buildPrdDocumentBlocks(source, {
    editable: true,
    readOnlyFields: { clientName: true },
    updaters: {
      updateProjectIntake: () => undefined,
      updateAgentDetails: () => undefined,
    },
  });

  const clientHeadingIndex = blocks.findIndex(
    (block) => block.kind === "heading" && block.text === "שם הלקוח"
  );

  assert.equal(blocks[clientHeadingIndex + 1]?.kind, "paragraph");
  assert.deepEqual(blocks[clientHeadingIndex + 1], {
    kind: "paragraph",
    text: "ביטוח ישיר",
  });
});
