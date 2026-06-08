import { NextRequest, NextResponse } from "next/server";
import {
  isAzureOpenAiConfigured,
  polishDraftWithAzure,
  resolveLlmDraftMode,
} from "@/lib/llm/azureOpenAI";
import { durationMs, logError, logInfo } from "@/lib/logger";
import type { LlmDraftPolishRequest, LlmDraftSections } from "@/types/llmDraft";

const isString = (value: unknown): value is string => typeof value === "string";
const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
const isNumber = (value: unknown): value is number => typeof value === "number";

function validateFileRefs(files: unknown): boolean {
  return (
    Array.isArray(files) &&
    files.every((file) => {
      if (!file || typeof file !== "object") return false;
      const f = file as Record<string, unknown>;
      return isString(f.id) && isString(f.name) && isString(f.kind) && isString(f.uploadStatus);
    })
  );
}

function validateSections(input: unknown): input is LlmDraftSections {
  if (!input || typeof input !== "object") return false;
  const s = input as LlmDraftSections;
  if (
    !s.protected ||
    typeof s.protected !== "object" ||
    !isString(s.protected.clientName) ||
    !isString(s.protected.documentAuthorName) ||
    !isString(s.protected.agentName)
  ) {
    return false;
  }
  if (!s.general || typeof s.general.shortAgentDescription !== "string") return false;
  if (!Array.isArray(s.useCases)) return false;
  if (!Array.isArray(s.dataSources)) return false;
  if (!Array.isArray(s.concepts)) return false;
  if (!Array.isArray(s.metrics)) return false;
  return (
    s.useCases.every((uc) => {
      if (!uc || typeof uc !== "object") return false;
      return (
        isString(uc.id) &&
        isString(uc.useCaseName) &&
        isString(uc.title) &&
        isString(uc.performer) &&
        Array.isArray(uc.systemsInvolved) &&
        uc.systemsInvolved.every(isString) &&
        isString(uc.additionalNotes) &&
        Array.isArray(uc.qaPairs) &&
        uc.qaPairs.every(
          (qa) =>
            qa &&
            typeof qa === "object" &&
            isString(qa.id) &&
            isString(qa.question) &&
            isString(qa.expectedAnswer) &&
            isString(qa.dataSourceRef)
        ) &&
        Array.isArray(uc.flowSteps) &&
        uc.flowSteps.every(
          (step) =>
            step &&
            typeof step === "object" &&
            isString(step.id) &&
            isNumber(step.order) &&
            isString(step.description) &&
            isBoolean(step.hasCalculation) &&
            isString(step.calculationDetails) &&
            validateFileRefs(step.files)
        )
      );
    }) &&
    s.dataSources.every(
      (ds) =>
        ds &&
        typeof ds === "object" &&
        isString(ds.id) &&
        isString(ds.name) &&
        isString(ds.type) &&
        isString(ds.description) &&
        isString(ds.accessMethod) &&
        validateFileRefs(ds.files)
    ) &&
    s.concepts.every(
      (concept) =>
        concept &&
        typeof concept === "object" &&
        isString(concept.id) &&
        isString(concept.term) &&
        isString(concept.definition) &&
        isString(concept.examples)
    ) &&
    s.metrics.every(
      (metric) =>
        metric &&
        typeof metric === "object" &&
        isString(metric.id) &&
        isString(metric.metric) &&
        isString(metric.target) &&
        isString(metric.measurementMethod)
    )
  );
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();

  if (!isAzureOpenAiConfigured()) {
    return NextResponse.json({ error: "שירות AI לא מוגדר" }, { status: 503 });
  }

  let body: LlmDraftPolishRequest;
  try {
    body = (await request.json()) as LlmDraftPolishRequest;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  if (!validateSections(body.sections)) {
    return NextResponse.json({ error: "מבנה נתונים לא תקין" }, { status: 400 });
  }

  const mode = resolveLlmDraftMode(body.mode);

  try {
    const sections = await polishDraftWithAzure(body.sections, mode);
    logInfo("llm draft polished", {
      route: "/api/llm/polish-draft",
      method: "POST",
      mode,
      useCases: body.sections.useCases.length,
      dataSources: body.sections.dataSources.length,
      concepts: body.sections.concepts.length,
      metrics: body.sections.metrics.length,
      durationMs: durationMs(startedAt),
    });
    return NextResponse.json({ sections, mode });
  } catch (error) {
    logError("llm draft polish failed", error, {
      route: "/api/llm/polish-draft",
      method: "POST",
      mode,
      durationMs: durationMs(startedAt),
    });
    return NextResponse.json(
      { error: "לא הצלחנו לשפר את הטיוטה. נסה שוב בעוד רגע." },
      { status: 502 }
    );
  }
}
