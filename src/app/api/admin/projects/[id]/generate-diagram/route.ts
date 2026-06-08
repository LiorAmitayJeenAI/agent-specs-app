import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAzureOpenAiConfigured, generateDiagramWithAzure } from "@/lib/llm/azureOpenAI";
import {
  buildDiagramPayload,
  hashDiagramPayload,
  type DiagramProjectInclude,
} from "@/lib/llm/diagramPayload";
import { persistDiagram } from "@/lib/diagram/persistDiagram";
import { durationMs, logError, logInfo } from "@/lib/logger";
import type { DiagramType, GenerateDiagramRequest } from "@/types/diagram";

const projectInclude = {
  client: true,
  use_cases: {
    include: {
      flow_steps: { orderBy: { step_number: "asc" as const } },
      qa_pairs: { orderBy: { order: "asc" as const } },
    },
  },
  data_sources: true,
  glossary: true,
  success_metrics: true,
};

function isDiagramType(value: unknown): value is DiagramType {
  return value === "flow" || value === "architecture";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = performance.now();

  if (!isAzureOpenAiConfigured()) {
    return NextResponse.json({ error: "שירות AI לא מוגדר" }, { status: 503 });
  }

  const { id } = await params;
  let body: GenerateDiagramRequest;
  try {
    body = (await request.json()) as GenerateDiagramRequest;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  if (!isDiagramType(body.type)) {
    return NextResponse.json({ error: "סוג תרשים לא תקין" }, { status: 400 });
  }
  const diagramType: DiagramType = body.type;

  try {
    const project = await prisma.project.findUnique({
      where: { project_id: id },
      include: projectInclude,
    });

    if (!project) {
      return NextResponse.json({ error: "הפרויקט לא נמצא" }, { status: 404 });
    }

    if (project.status !== "completed") {
      if (body.syncStatus === "completed") {
        await prisma.project.update({
          where: { project_id: id },
          data: { status: "completed" },
        });
        project.status = "completed";
      } else {
        return NextResponse.json(
          {
            error:
              "יש לשמור את השינויים (שמור שינויים) לאחר הגדרת הסטטוס ל'הושלם', ואז ליצור תרשים",
          },
          { status: 400 }
        );
      }
    }

    const payload = buildDiagramPayload(project as DiagramProjectInclude);

    if (body.type === "flow" && payload.useCases.length === 0) {
      return NextResponse.json(
        { error: "יש להוסיף לפחות תרחיש שימוש אחד" },
        { status: 400 }
      );
    }

    const specHash = hashDiagramPayload(payload);
    const xml = await generateDiagramWithAzure(payload, body.type);
    const diagram = await persistDiagram({
      projectId: id,
      type: body.type,
      xml,
      specHash,
    });

    logInfo("admin diagram generated", {
      route: "/api/admin/projects/[id]/generate-diagram",
      method: "POST",
      projectId: id,
      diagramType,
      fileId: diagram.fileId,
      specHash,
      useCases: payload.useCases.length,
      dataSources: payload.dataSources.length,
      durationMs: durationMs(startedAt),
    });

    return NextResponse.json({ diagram });
  } catch (error) {
    logError("admin diagram generation failed", error, {
      route: "/api/admin/projects/[id]/generate-diagram",
      method: "POST",
      projectId: id,
      diagramType,
      durationMs: durationMs(startedAt),
    });
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "יצירת התרשים ארכה יותר מדי. נסה שוב." },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: "לא הצלחנו ליצור את התרשים. נסה שוב." },
      { status: 502 }
    );
  }
}
