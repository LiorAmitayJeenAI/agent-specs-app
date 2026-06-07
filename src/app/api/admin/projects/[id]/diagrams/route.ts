import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildDiagramPayload,
  hashDiagramPayload,
  type DiagramProjectInclude,
} from "@/lib/llm/diagramPayload";
import { validateDrawioXml } from "@/lib/diagram/drawioValidate";
import { persistDiagram } from "@/lib/diagram/persistDiagram";
import type { DiagramType, SaveDiagramRequest } from "@/types/diagram";

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: SaveDiagramRequest;
  try {
    body = (await request.json()) as SaveDiagramRequest;
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  if (!isDiagramType(body.type)) {
    return NextResponse.json({ error: "סוג תרשים לא תקין" }, { status: 400 });
  }

  if (typeof body.xml !== "string" || !body.xml.trim()) {
    return NextResponse.json({ error: "תוכן התרשים חסר" }, { status: 400 });
  }

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
        { error: "ניתן לערוך תרשימים רק במסמך שהושלם" },
        { status: 400 }
      );
    }

    let xml: string;
    try {
      xml = validateDrawioXml(body.xml);
    } catch {
      return NextResponse.json({ error: "קובץ התרשים לא תקין" }, { status: 400 });
    }

    const payload = buildDiagramPayload(project as DiagramProjectInclude);
    const specHash = hashDiagramPayload(payload);
    const diagram = await persistDiagram({
      projectId: id,
      type: body.type,
      xml,
      specHash,
    });

    return NextResponse.json({ diagram });
  } catch (error) {
    console.error("Save diagram error:", error);
    return NextResponse.json({ error: "לא הצלחנו לשמור את התרשים" }, { status: 500 });
  }
}
