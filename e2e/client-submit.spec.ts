import { expect, test } from "@playwright/test";
import {
  createProject,
  deleteProject,
  disableExternalServiceCalls,
  E2E_CLIENT_NAME,
  getProject,
  resetBrowserState,
  uniqueE2EName,
} from "./helpers/project";

test.beforeEach(async ({ page }) => {
  await resetBrowserState(page);
  await disableExternalServiceCalls(page);
});

test("client link loads project details and requires an author before starting", async ({
  page,
  request,
}) => {
  const projectName = uniqueE2EName("אפיון לקוח");
  const projectId = await createProject(request, { projectName });

  try {
    await page.goto(`/client?projectId=${projectId}`);

    await expect(page.locator("#client-name")).toHaveValue(E2E_CLIENT_NAME);
    await expect(page.locator("#client-name")).toBeDisabled();
    await expect(page.locator("#agent-name")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /התחלת האפיון/ })).toBeDisabled();

    await page.locator("#author-name").fill("ישראל ישראלי");
    await expect(page.getByRole("button", { name: /התחלת האפיון/ })).toBeEnabled();
  } finally {
    await deleteProject(request, projectId);
  }
});

test("client can complete the core wizard and submit a spec", async ({ page, request }) => {
  const projectName = uniqueE2EName("אפיון לקוח מלא");
  const projectId = await createProject(request, { projectName });
  const agentName = uniqueE2EName("סוכן לקוח");
  const useCaseName = uniqueE2EName("בדיקת בקשות");

  try {
    await page.goto(`/client?projectId=${projectId}`);

    await page.locator("#author-name").fill("נועה כהן");
    await page.locator("#department").fill("מוקד שירות");
    await page.locator("#position").fill("מנהלת צוות");
    await page.getByRole("button", { name: /התחלת האפיון/ }).click();

    await page.locator("#agent-name").fill(agentName);
    await page
      .locator("#agent-description")
      .fill("סוכן שמרכז מידע על בקשות שירות ומחזיר תשובות אחידות לנציגים.");
    await page.getByRole("button", { name: /המשך להגדרת תרחישי שימוש/ }).click();

    await page.getByRole("button", { name: /הוסף תרחיש שימוש ראשון/ }).click();
    await page.locator('input[id^="use-case-name-"]').fill(useCaseName);
    await page
      .locator('textarea[id^="use-case-description-"]')
      .fill("נציג בודק סטטוס בקשת שירות עבור לקוח.");
    await page.locator('input[id^="performer-"]').fill("נציג שירות");
    await page.getByPlaceholder(/מה הסטטוס/).fill("מה הסטטוס של בקשה 123?");
    await page.getByPlaceholder(/ההזמנה אושרה/).fill("הבקשה ממתינה לאישור מנהל.");
    await page.getByPlaceholder(/SAP - טבלת הזמנות/).fill("CRM");
    await page.getByText("לחצו כדי להוסיף את הצעד הראשון בתהליך הקיים").click();
    await page
      .locator('textarea[id^="step-desc-"]')
      .fill("הנציג פותח את ה-CRM ומחפש את הבקשה לפי מספר מזהה.");
    await page.getByRole("button", { name: /המשך לשלב הבא/ }).click();

    await page.getByRole("button", { name: /הוסף מקור מידע/ }).click();
    await page.locator('input[id^="ds-name-"]').fill("CRM");
    await page.locator('select[id^="ds-type-"]').selectOption("מערכת CRM");
    await page.locator('textarea[id^="ds-desc-"]').fill("מערכת לניהול לקוחות ובקשות שירות.");
    await page.getByRole("button", { name: /המשך לשלב הבא/ }).click();

    await expect(page.getByRole("heading", { name: "סיכום ושליחה" })).toBeVisible();

    const submitResponse = page.waitForResponse(
      (response) => response.url().includes("/api/submit") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: /שלח לצוות/ }).click();
    await expect((await submitResponse).ok()).toBe(true);
    await expect(page.getByText("הטופס נשלח בהצלחה!")).toBeVisible();

    const savedProject = await getProject(request, projectId);
    expect(savedProject.status).toBe("client_draft");
    expect(savedProject.agentName).toBe(agentName);
    expect(savedProject.useCases).toHaveLength(1);
    expect(savedProject.useCases[0].name).toBe(useCaseName);
    expect(savedProject.useCases[0].qaPairs).toHaveLength(1);
    expect(savedProject.useCases[0].flowSteps).toHaveLength(1);
    expect(savedProject.dataSources).toHaveLength(1);
    expect(savedProject.requirementDocumentCount).toBeGreaterThan(0);
  } finally {
    await deleteProject(request, projectId);
  }
});
