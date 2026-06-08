import { expect, test } from "@playwright/test";
import {
  buildAdminProjectPayload,
  createProject,
  deleteProject,
  disableExternalServiceCalls,
  E2E_CLIENT_NAME,
  getProject,
  resetBrowserState,
  uniqueE2EName,
  updateProject,
} from "./helpers/project";

test.beforeEach(async ({ page }) => {
  await resetBrowserState(page);
  await disableExternalServiceCalls(page);
});

test("admin can create a project from the dashboard and delete it", async ({ page, request }) => {
  const projectName = uniqueE2EName("פרויקט");
  const projectManagerName = uniqueE2EName("מנהלת");
  let projectId: string | undefined;

  try {
    await page.goto("/");

    await page.getByRole("button", { name: "אפיון חדש" }).click();
    await page.locator("#new-spec-client").selectOption(E2E_CLIENT_NAME);
    await page.locator("#new-spec-pm").fill(projectManagerName);
    await page.locator("#new-spec-project").fill(projectName);
    await page.getByRole("button", { name: "צור מסמך אפיון" }).click();

    const generatedLink = page.locator('input[readonly][dir="ltr"]');
    await expect(generatedLink).toHaveValue(/\/client\?projectId=[0-9a-f-]{36}$/i);
    projectId = (await generatedLink.inputValue()).match(/[0-9a-f-]{36}$/i)?.[0];
    expect(projectId).toBeTruthy();

    await page.getByRole("button", { name: "סגור" }).click();
    const projectRow = page.getByRole("row").filter({ hasText: projectName });
    await expect(projectRow).toBeVisible();
    await expect(projectRow.getByText(projectManagerName)).toBeVisible();
    await projectRow.getByTitle("מחק אפיון").click();
    await page.getByRole("button", { name: "כן, מחק" }).click();

    await expect(projectRow).toHaveCount(0);
    projectId = undefined;
  } finally {
    await deleteProject(request, projectId);
  }
});

test("admin can open a seeded project and save core details", async ({ page, request }) => {
  const projectId = await createProject(request);
  const seedPayload = buildAdminProjectPayload({
    agentName: uniqueE2EName("סוכן seeded"),
    status: "pm_review",
  });
  const updatedAgentName = uniqueE2EName("סוכן מעודכן");
  const updatedDescription = "תיאור מעודכן שנשמר דרך מסך מנהל הפרויקט.";

  try {
    await updateProject(request, projectId, seedPayload);

    await page.goto(`/admin/project/${projectId}/view`);
    await expect(page.locator("#agent-name")).toHaveValue(seedPayload.agentName);

    await page.locator("#agent-name").fill(updatedAgentName);
    await page.locator("#agent-description").fill(updatedDescription);

    const saveResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/admin/projects/${projectId}`) &&
        response.request().method() === "PUT"
    );
    await page.getByRole("button", { name: "שמור שינויים" }).click();
    await expect((await saveResponse).ok()).toBe(true);
    await expect(page.getByText("השינויים נשמרו וקובץ ה-Word עודכן")).toBeVisible();

    const savedProject = await getProject(request, projectId);
    expect(savedProject.agentName).toBe(updatedAgentName);
    expect(savedProject.agentDescription).toBe(updatedDescription);
    expect(savedProject.status).toBe("pm_review");
    expect(savedProject.useCases).toHaveLength(1);
  } finally {
    await deleteProject(request, projectId);
  }
});
