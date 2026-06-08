import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const E2E_CLIENT_NAME = "מכבי שירותי בריאות";

export interface AdminProjectPayload {
  clientName: string;
  projectName: string;
  authorName: string;
  authorDepartment?: string | null;
  authorPosition?: string | null;
  agentName: string;
  agentDescription: string;
  status?: "sent_to_client" | "client_draft" | "pm_review" | "completed";
  useCases: {
    name: string;
    title?: string | null;
    performedBy?: string | null;
    systems: string[];
    notes?: string | null;
    qaPairs: {
      question: string;
      expectedAnswer: string;
      dataSourceRef?: string | null;
    }[];
    flowSteps: {
      order: number;
      description: string;
      hasCalculation: boolean;
      calculationDetails?: string | null;
    }[];
  }[];
  dataSources: {
    name: string;
    type?: string | null;
    description?: string | null;
    accessMethod?: string | null;
  }[];
  concepts: {
    term: string;
    definition?: string | null;
    examples?: string | null;
  }[];
  metrics: {
    name: string;
    target?: string | null;
    measurementMethod?: string | null;
    priority?: string;
  }[];
}

export interface AdminProjectDetail {
  projectId: string;
  clientName: string;
  projectName: string;
  projectManagerName: string | null;
  authorName: string;
  status: string;
  agentName: string;
  agentDescription: string;
  requirementDocumentCount: number;
  useCases: {
    name: string;
    qaPairs: { question: string; expectedAnswer: string }[];
    flowSteps: { description: string }[];
  }[];
  dataSources: { name: string }[];
  concepts: { term: string }[];
  metrics: { name: string }[];
}

export function uniqueE2EName(label: string) {
  return `${label} E2E ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function resetBrowserState(page: Page) {
  await page.context().clearCookies();
  await page.addInitScript(() => {
    localStorage.removeItem("agent-specs-form-draft");
    localStorage.removeItem("admin-session");
    sessionStorage.clear();
  });
}

export async function disableExternalServiceCalls(page: Page) {
  await page.route("**/api/llm/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ configured: false, mode: "formal" }),
    });
  });
  await page.route("**/api/llm/**", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "LLM disabled in E2E" }),
    });
  });
  await page.route("**/api/file-upload", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        fileName: "e2e-placeholder.docx",
        blobUrl: "https://example.invalid/e2e-placeholder.docx",
        blobPath: "e2e/e2e-placeholder.docx",
      }),
    });
  });
  await page.route("**/api/copy-companion-files", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ copiedFiles: [] }),
    });
  });
  await page.route("**/api/projects/*/diagrams", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });
  await page.route("**/api/admin/projects/*/generate-diagram", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Diagram generation disabled in E2E" }),
    });
  });
}

export async function createProject(
  request: APIRequestContext,
  overrides: Partial<{
    clientName: string;
    projectManagerName: string;
    projectName: string;
  }> = {}
) {
  const response = await request.post("/api/admin/projects", {
    data: {
      clientName: overrides.clientName ?? E2E_CLIENT_NAME,
      projectManagerName: overrides.projectManagerName ?? uniqueE2EName("מנהלת"),
      projectName: overrides.projectName ?? uniqueE2EName("פרויקט"),
    },
  });

  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { projectId: string };
  return body.projectId;
}

export async function deleteProject(request: APIRequestContext, projectId: string | null | undefined) {
  if (!projectId) return;
  const response = await request.delete(`/api/admin/projects/${projectId}`);
  expect([200, 404]).toContain(response.status());
}

export async function getProject(request: APIRequestContext, projectId: string) {
  const response = await request.get(`/api/admin/projects/${projectId}`);
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as AdminProjectDetail;
}

export async function updateProject(
  request: APIRequestContext,
  projectId: string,
  payload: AdminProjectPayload
) {
  const response = await request.put(`/api/admin/projects/${projectId}`, {
    data: payload,
  });
  expect(response.ok(), await response.text()).toBe(true);
}

export function buildAdminProjectPayload(overrides: Partial<AdminProjectPayload> = {}): AdminProjectPayload {
  const agentName = overrides.agentName ?? uniqueE2EName("סוכן");

  return {
    clientName: overrides.clientName ?? E2E_CLIENT_NAME,
    projectName: overrides.projectName ?? agentName,
    authorName: overrides.authorName ?? uniqueE2EName("עורכת"),
    authorDepartment: overrides.authorDepartment ?? "תפעול",
    authorPosition: overrides.authorPosition ?? "מנהלת תהליך",
    agentName,
    agentDescription:
      overrides.agentDescription ??
      "סוכן שמרכז נתונים תפעוליים ומציע תשובות עקביות לצוות.",
    status: overrides.status ?? "pm_review",
    useCases:
      overrides.useCases ??
      [
        {
          name: uniqueE2EName("בדיקת סטטוס"),
          title: "בדיקת סטטוס בקשה מול מערכות פנימיות",
          performedBy: "נציג שירות",
          systems: ["CRM", "ERP"],
          notes: "תרחיש בסיסי ל-E2E",
          qaPairs: [
            {
              question: "מה הסטטוס של בקשה 123?",
              expectedAnswer: "הבקשה ממתינה לאישור מנהל.",
              dataSourceRef: "CRM",
            },
          ],
          flowSteps: [
            {
              order: 1,
              description: "הנציג פותח את מערכת ה-CRM ומחפש לפי מספר בקשה.",
              hasCalculation: false,
            },
          ],
        },
      ],
    dataSources:
      overrides.dataSources ??
      [
        {
          name: "CRM",
          type: "מערכת פנימית",
          description: "נתוני לקוחות ובקשות",
          accessMethod: "API פנימי",
        },
      ],
    concepts:
      overrides.concepts ??
      [
        {
          term: "בקשה פתוחה",
          definition: "בקשה שעדיין לא נסגרה מול הלקוח",
          examples: "בקשת שירות שממתינה לאישור",
        },
      ],
    metrics:
      overrides.metrics ??
      [
        {
          name: "זמן מענה",
          target: "פחות מ-2 דקות",
          measurementMethod: "מדידה במערכת השירות",
          priority: "high",
        },
      ],
  };
}
