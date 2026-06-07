import type { LlmDraftMode, LlmDraftSections } from "@/types/llmDraft";
import type { DiagramType } from "@/types/diagram";
import { getLlmDraftSystemPrompt } from "@/lib/llm/prompts";
import { getDiagramSystemPrompt } from "@/lib/llm/diagramPrompts";
import { validateDrawioXml } from "@/lib/diagram/drawioValidate";
import type { DiagramPayload } from "@/lib/llm/diagramPayload";

export function resolveLlmDraftMode(override?: LlmDraftMode): LlmDraftMode {
  const fromEnv = process.env.LLM_DRAFT_MODE?.trim().toLowerCase();
  if (override === "formal" || override === "polish") return override;
  if (fromEnv === "polish") return "polish";
  return "formal";
}

export function isAzureOpenAiConfigured(): boolean {
  return Boolean(
    process.env.AZURE_OPENAI_ENDPOINT?.trim() &&
      process.env.AZURE_OPENAI_API_KEY?.trim() &&
      process.env.AZURE_OPENAI_DEPLOYMENT?.trim()
  );
}

function getAzureConfig() {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim().replace(/\/$/, "");
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT?.trim();
  const apiVersion =
    process.env.AZURE_OPENAI_API_VERSION?.trim() || "2024-08-01-preview";

  if (!endpoint || !apiKey || !deployment) {
    throw new Error("Azure OpenAI is not configured");
  }

  return { endpoint, apiKey, deployment, apiVersion };
}

function parseSectionsJson(raw: string): LlmDraftSections {
  const parsed = JSON.parse(raw) as { sections?: LlmDraftSections } | LlmDraftSections;
  const sections = "sections" in parsed && parsed.sections ? parsed.sections : parsed;
  if (!sections || typeof sections !== "object") {
    throw new Error("Invalid LLM response shape");
  }
  return sections as LlmDraftSections;
}

async function callAzureChat(
  systemPrompt: string,
  userContent: string,
  strictRetry: boolean
): Promise<string> {
  const { endpoint, apiKey, deployment, apiVersion } = getAzureConfig();
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: strictRetry
            ? `${userContent}\n\nהחזר אך ורק JSON תקין עם המפתח sections באותה צורה כמו הקלט.`
            : userContent,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Azure OpenAI error ${response.status}: ${detail.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from Azure OpenAI");
  }
  return content;
}

async function callAzureChatRaw(
  systemPrompt: string,
  userContent: string,
  strictRetry: boolean
): Promise<string> {
  const { endpoint, apiKey, deployment, apiVersion } = getAzureConfig();
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: strictRetry
              ? `${userContent}\n\nהפלט הקודם לא היה XML תקין. החזר רק mxfile XML תקין של draw.io.`
              : userContent,
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Azure OpenAI error ${response.status}: ${detail.slice(0, 200)}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Azure OpenAI");
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateDiagramWithAzure(
  payload: DiagramPayload,
  type: DiagramType
): Promise<string> {
  const systemPrompt = getDiagramSystemPrompt(type);
  const userContent = JSON.stringify({ diagramType: type, spec: payload });

  const attempt = async (strict: boolean) => {
    const raw = await callAzureChatRaw(systemPrompt, userContent, strict);
    return validateDrawioXml(raw);
  };

  try {
    return await attempt(false);
  } catch (firstError) {
    try {
      return await attempt(true);
    } catch {
      throw firstError;
    }
  }
}

export async function polishDraftWithAzure(
  sections: LlmDraftSections,
  mode: LlmDraftMode
): Promise<LlmDraftSections> {
  const systemPrompt = getLlmDraftSystemPrompt(mode);
  const userContent = JSON.stringify({ sections });

  try {
    const content = await callAzureChat(systemPrompt, userContent, false);
    return parseSectionsJson(content);
  } catch (firstError) {
    try {
      const content = await callAzureChat(systemPrompt, userContent, true);
      return parseSectionsJson(content);
    } catch {
      throw firstError;
    }
  }
}
