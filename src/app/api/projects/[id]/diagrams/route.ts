import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildDiagramPayload,
  hashDiagramPayload,
  type DiagramProjectInclude,
} from "@/lib/llm/diagramPayload";
import { durationMs, logError } from "@/lib/logger";
import type { DiagramMeta, DiagramType, ProjectDiagramsResponse } from "@/types/diagram";

const DIAGRAM_TYPES: DiagramType[] = ["flow", "architecture"];

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

function toMeta(
  file: {
    file_id: string;
    blob_url: string;
    file_name: string;
    uploaded_at: Date;
    spec_hash: string | null;
  },
  currentHash: string
): DiagramMeta {
  const storedHash = file.spec_hash ?? "";
  return {
    fileId: file.file_id,
    proxyUrl: `/api/file-proxy?path=${encodeURIComponent(file.blob_url)}`,
    fileName: file.file_name,
    generatedAt: file.uploaded_at.toISOString(),
    specHash: storedHash,
    isStale: Boolean(storedHash) && storedHash !== currentHash,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = performance.now();
  const { id } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: { project_id: id },
      include: projectInclude,
    });

    if (!project) {
      return NextResponse.json({ error: "הפרויקט לא נמצא" }, { status: 404 });
    }

    if (project.status !== "completed") {
      return NextResponse.json(
        { error: "תרשימים זמינים רק למסמך שהושלם" },
        { status: 400 }
      );
    }

    const payload = buildDiagramPayload(project as DiagramProjectInclude);
    const currentHash = hashDiagramPayload(payload);

    const files = await prisma.file.findMany({
      where: {
        related_entity_type: "diagram",
        related_entity_id: id,
        field_name: { in: DIAGRAM_TYPES },
      },
      orderBy: { uploaded_at: "desc" },
    });

    const latestByType = new Map<string, (typeof files)[0]>();
    for (const file of files) {
      if (file.field_name && !latestByType.has(file.field_name)) {
        latestByType.set(file.field_name, file);
      }
    }

    const response: ProjectDiagramsResponse = {
      flow: latestByType.has("flow")
        ? toMeta(latestByType.get("flow")!, currentHash)
        : null,
      architecture: latestByType.has("architecture")
        ? toMeta(latestByType.get("architecture")!, currentHash)
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    logError("project diagrams list failed", error, {
      route: "/api/projects/[id]/diagrams",
      method: "GET",
      projectId: id,
      durationMs: durationMs(startedAt),
    });
    return NextResponse.json({ error: "שגיאה בטעינת התרשימים" }, { status: 500 });
  }
}
