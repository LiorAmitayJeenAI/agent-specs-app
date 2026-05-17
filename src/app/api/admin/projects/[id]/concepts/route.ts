import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/admin-auth";

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
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  try {
    const body: { concepts: ConceptPayload[] } = await request.json();

    if (!Array.isArray(body.concepts)) {
      return NextResponse.json(
        { error: "concepts must be an array" },
        { status: 400 }
      );
    }

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin update concepts error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון המושגים" },
      { status: 500 }
    );
  }
}
