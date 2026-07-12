import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

const localStorageMock = new MemoryStorage();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  configurable: true,
});

beforeEach(async () => {
  localStorageMock.clear();

  const { useFormStore } = await import("./formStore");

  useFormStore.getState().resetForm();

  useFormStore.setState({
    isLoginComplete: false,
    isAdminView: false,
    projectId: null,
    currentStep: 1,
    maxAccessibleStep: 1,
    useCases: [],
    dataSources: [],
    concepts: [],
    successMetrics: [],
  });

  await useFormStore.persist.clearStorage();
});

test("persists draft data under the configured storage key", async () => {
  const { useFormStore } = await import("./formStore");

  useFormStore.getState().setProjectId("project-123");

  useFormStore.getState().updateProjectIntake({
    clientName: "Acme",
    documentAuthorName: "Dana",
  });

  useFormStore.getState().updateAgentDetails({
    requestedAgentName: "Support Agent",
    shortAgentDescription: "Handles support requests",
  });

  await useFormStore.persist.rehydrate();

  const raw = localStorageMock.getItem("agent-specs-form-draft");

  assert.ok(raw);

  const persisted = JSON.parse(raw);

  assert.equal(persisted.state.projectId, "project-123");

  assert.deepEqual(persisted.state.projectIntake, {
    clientName: "Acme",
    documentAuthorName: "Dana",
    department: "",
    position: "",
  });

  assert.deepEqual(persisted.state.agentDetails, {
    requestedAgentName: "Support Agent",
    shortAgentDescription: "Handles support requests",
  });
});

test("does not persist admin-only state fields", async () => {
  const { useFormStore } = await import("./formStore");

  useFormStore.setState({
    isAdminView: true,
    projectStatus: "completed",
  });

  await useFormStore.persist.rehydrate();

  const raw = localStorageMock.getItem("agent-specs-form-draft");

  assert.ok(raw);

  const persisted = JSON.parse(raw);

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      persisted.state,
      "isAdminView"
    ),
    false
  );

  assert.equal(
    Object.prototype.hasOwnProperty.call(
      persisted.state,
      "projectStatus"
    ),
    false
  );
});

test("resetForm clears persisted draft state back to initial values", async () => {
  const { useFormStore } = await import("./formStore");

  useFormStore.getState().setProjectId("draft-project");

  useFormStore.getState().updateProjectIntake({
    clientName: "Saved Client",
  });

  useFormStore.getState().resetForm();

  const state = useFormStore.getState();

  assert.equal(state.projectId, null);

  assert.deepEqual(state.projectIntake, {
    clientName: "",
    documentAuthorName: "",
    department: "",
    position: "",
  });

  assert.deepEqual(state.agentDetails, {
    requestedAgentName: "",
    shortAgentDescription: "",
  });

  assert.equal(state.currentStep, 1);
  assert.equal(state.maxAccessibleStep, 1);
});

test("migrates legacy use case drafts to qaPairs structure", async () => {
  localStorageMock.setItem(
    "agent-specs-form-draft",
    JSON.stringify({
      state: {
        useCases: [
          {
            id: "uc-1",
            useCaseName: "Legacy Use Case",
            userQuestion: "What is the order status?",
            expectedAnswer: "Order is processing",
            flowSteps: [],
          },
        ],
      },
      version: 1,
    })
  );

  const { useFormStore } = await import("./formStore");

  await useFormStore.persist.rehydrate();

  const state = useFormStore.getState();

  assert.equal(state.useCases.length, 1);

  const migratedUseCase = state.useCases[0];

  assert.equal(migratedUseCase.qaPairs.length, 1);

  assert.equal(
    migratedUseCase.qaPairs[0]?.question,
    "What is the order status?"
  );

  assert.equal(
    migratedUseCase.qaPairs[0]?.expectedAnswer,
    "Order is processing"
  );

  assert.equal(
    "userQuestion" in migratedUseCase,
    false
  );

  assert.equal(
    "expectedAnswer" in migratedUseCase,
    false
  );
});

test("creates an empty qaPairs entry when migrating incomplete legacy drafts", async () => {
  localStorageMock.setItem(
    "agent-specs-form-draft",
    JSON.stringify({
      state: {
        useCases: [
          {
            id: "uc-2",
            useCaseName: "Empty Legacy Use Case",
            flowSteps: [],
          },
        ],
      },
      version: 1,
    })
  );

  const { useFormStore } = await import("./formStore");

  await useFormStore.persist.rehydrate();

  const migratedUseCase = useFormStore.getState().useCases[0];

  assert.equal(migratedUseCase.qaPairs.length, 1);

  assert.equal(migratedUseCase.qaPairs[0]?.question, "");
  assert.equal(migratedUseCase.qaPairs[0]?.expectedAnswer, "");
  assert.equal(migratedUseCase.qaPairs[0]?.order, 1);
});