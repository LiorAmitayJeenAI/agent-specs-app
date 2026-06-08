import { NextRequest, NextResponse } from "next/server";
import { durationMs, logError, logInfo } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

interface ConceptPayload {
  id?: string;
  term: string;
  definition?: string;
  examples?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = performance.now();
  const { id: projectId } = await params;
  let conceptCount: number | undefined;

  try {
    const body: { concepts: ConceptPayload[] } = await request.json();

    if (!Array.isArray(body.concepts)) {
      return NextResponse.json(
        { error: "concepts must be an array" },
        { status: 400 }
      );
    }
    conceptCount = body.concepts.length;

    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { project_id: true },
    });

    if (!project) {
      return NextResponse.json({ error: "הפרויקט לא נמצא" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.glossaryTerm.deleteMany({ where: { project_id: projectId } });

      if (body.concepts.length > 0) {
        await tx.glossaryTerm.createMany({
          data: body.concepts.map((c) => ({
            project_id: projectId,
            term: c.term,
            definition: c.definition ?? null,
            examples: c.examples ?? null,
          })),
        });
      }
    });

    logInfo("admin project concepts updated", {
      route: "/api/admin/projects/[id]/concepts",
      method: "PUT",
      projectId,
      conceptCount,
      durationMs: durationMs(startedAt),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("admin project concepts update failed", error, {
      route: "/api/admin/projects/[id]/concepts",
      method: "PUT",
      projectId,
      conceptCount,
      durationMs: durationMs(startedAt),
    });
    return NextResponse.json(
      { error: "שגיאה בעדכון המושגים" },
      { status: 500 }
    );
  }
}
