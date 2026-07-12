import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";

const prismaMock = {
  client: {
    findFirst: async () => null,
    create: async () => ({ client_id: "client-1" }),
  },
  project: {
    create: async () => ({
      project_id: "project-1",
      client_id: "client-1",
    }),
    findUnique: async () => null,
    update: async () => undefined,
  },
  successMetric: {
    deleteMany: async () => undefined,
  },
  flowStep: {
    deleteMany: async () => undefined,
  },
  useCaseQAPair: {
    deleteMany: async () => undefined,
  },
  useCase: {
    deleteMany: async () => undefined,
  },
  dataSource: {
    deleteMany: async () => undefined,
  },
  glossaryTerm: {
    deleteMany: async () => undefined,
  },
  requirementDocument: {
    deleteMany: async () => undefined,
  },
  file: {
    updateMany: async () => undefined,
  },
  $transaction: async (callback: (tx: unknown) => Promise<void>) => {
    await callback(prismaMock);
  },
};

mock.module("@/lib/prisma", {
  namedExports: {
    prisma: prismaMock,
  },
});

mock.module("@/lib/logger", {
  namedExports: {
    logInfo: () => undefined,
    logError: () => undefined,
    durationMs: () => 1,
  },
});

const { POST } = await import("./route.ts");

function buildValidBody() {
  return {
    submittedAt: "2026-01-01T00:00:00.000Z",
    projectIntake: {
      clientName: "ביטוח ישיר",
      documentAuthorName: "Dana",
      department: "IT",
      position: "PM",
    },
    agentDetails: {
      requestedAgentName: "Support Agent",
      shortAgentDescription: "Handles customer requests",
    },
    useCases: [
      {
        useCaseName: "Customer support",
        title: "Handle ticket",
        performer: "Agent",
        systemsInvolved: ["CRM"],
        additionalNotes: "",
        qaPairs: [
          {
            question: "What is the ticket status?",
            expectedAnswer: "Open",
            dataSourceRef: "",
            dataSourceId: "",
          },
        ],
        flowSteps: [
          {
            order: 1,
            description: "Open CRM record",
            hasCalculation: false,
            calculationDetails: "",
          },
        ],
      },
    ],
    dataSources: [
      {
        name: "",
        type: "",
        description: "",
        accessMethod: "",
      },
      {
        name: "CRM",
        type: "API",
        description: "Customer data",
        accessMethod: "REST",
      },
    ],
    concepts: [
      {
        term: "",
        definition: "",
        examples: "",
      },
      {
        term: "Ticket",
        definition: "Support request",
        examples: "Billing issue",
      },
    ],
    successMetrics: [
      {
        metric: "",
        target: "",
        measurementMethod: "",
        priority: "medium",
      },
      {
        metric: "Response time",
        target: "30s",
        measurementMethod: "System tracking",
        priority: "high",
      },
    ],
    uploadedFiles: [
      {
        fileId: "file-1",
      },
    ],
  };
}

beforeEach(() => {
  prismaMock.client.findFirst = async () => null;

  prismaMock.project.create = async () => ({
    project_id: "project-1",
    client_id: "client-1",
  });

  prismaMock.project.findUnique = async () => null;
});

test("returns 400 when required intake or agent fields are missing", async () => {
  const body = buildValidBody();

  body.projectIntake.clientName = "";

  const response = await POST({
    json: async () => body,
  } as never);

  assert.equal(response.status, 400);

  const json = await response.json();

  assert.equal(json.error, "חסרים פרטי לקוח, עורך מסמך או סוכן");
});

test("returns 400 when customer is not in the allowed customer list", async () => {
  const body = buildValidBody();

  body.projectIntake.clientName = "לקוח לא מורשה";

  const response = await POST({
    json: async () => body,
  } as never);

  assert.equal(response.status, 400);

  const json = await response.json();

  assert.equal(json.error, "שם הלקוח אינו ברשימת הלקוחות המורשים");
});

test("returns 400 when no use cases are provided", async () => {
  const body = buildValidBody();

  body.useCases = [];

  const response = await POST({
    json: async () => body,
  } as never);

  assert.equal(response.status, 400);

  const json = await response.json();

  assert.equal(json.error, "חייב להיות לפחות תרחיש שימוש אחד");
});

test("returns 400 when a use case contains empty flow step descriptions", async () => {
  const body = buildValidBody();

  body.useCases[0].flowSteps = [
    {
      order: 1,
      description: "   ",
      hasCalculation: false,
      calculationDetails: "",
    },
  ];

  const response = await POST({
    json: async () => body,
  } as never);

  assert.equal(response.status, 400);

  const json = await response.json();

  assert.equal(
    json.error,
    "יש למלא פירוט התהליך הקיים (Flow) בכל תרחיש שימוש"
  );
});

test("creates a new project and returns submission summary", async () => {
  let capturedCreateData: unknown;

  prismaMock.project.create = async ({ data }: { data: unknown }) => {
    capturedCreateData = data;

    return {
      project_id: "project-1",
      client_id: "client-1",
    };
  };

  const response = await POST({
    json: async () => buildValidBody(),
  } as never);

  assert.equal(response.status, 200);

  const json = await response.json();

  assert.equal(json.success, true);
  assert.equal(json.projectId, "project-1");
  assert.equal(json.clientId, "client-1");

  assert.equal(json.summary.clientName, "ביטוח ישיר");
  assert.equal(json.summary.useCases, 1);
  assert.equal(json.summary.totalFlowSteps, 1);

  const createData = capturedCreateData as {
    data_sources: { create: Array<{ source_name: string }> };
    glossary: { create: Array<{ term: string }> };
    success_metrics: { create: Array<{ metric_name: string }> };
  };

  assert.equal(createData.data_sources.create.length, 1);
  assert.equal(createData.data_sources.create[0].source_name, "CRM");

  assert.equal(createData.glossary.create.length, 1);
  assert.equal(createData.glossary.create[0].term, "Ticket");

  assert.equal(createData.success_metrics.create.length, 1);
  assert.equal(
    createData.success_metrics.create[0].metric_name,
    "Response time"
  );
});

test("returns 404 when updating a project that does not exist", async () => {
  prismaMock.project.findUnique = async () => null;

  const body = buildValidBody();

  body.projectId = "missing-project";

  const response = await POST({
    json: async () => body,
  } as never);

  assert.equal(response.status, 404);

  const json = await response.json();

  assert.equal(json.error, "הפרויקט לא נמצא");
});

test("reuses an existing client instead of creating a new one", async () => {
  let clientCreateCalled = false;

  prismaMock.client.findFirst = async () => ({
    client_id: "existing-client",
  });

  prismaMock.client.create = async () => {
    clientCreateCalled = true;

    return {
      client_id: "new-client",
    };
  };

  const response = await POST({
    json: async () => buildValidBody(),
  } as never);

  assert.equal(response.status, 200);
  assert.equal(clientCreateCalled, false);
});

test("returns 500 when prisma throws an unexpected error", async () => {
  prismaMock.project.create = async () => {
    throw new Error("database failure");
  };

  const response = await POST({
    json: async () => buildValidBody(),
  } as never);

  assert.equal(response.status, 500);

  const json = await response.json();

  assert.equal(json.error, "אירעה שגיאה בעיבוד הבקשה");
});