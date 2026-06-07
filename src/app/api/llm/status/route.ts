import { NextResponse } from "next/server";
import { isAzureOpenAiConfigured, resolveLlmDraftMode } from "@/lib/llm/azureOpenAI";

export async function GET() {
  const configured = isAzureOpenAiConfigured();
  return NextResponse.json({
    configured,
    diagramCapable: configured,
    mode: resolveLlmDraftMode(),
  });
}
