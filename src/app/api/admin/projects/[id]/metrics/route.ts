import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface MetricPayload {
  id?: string;
  name: string;
  target?: string;
  measurementMethod?: string;
  priority?: string;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  try {
    const body: { metrics: MetricPayload[] } = await request.json();

    if (!Array.isArray(body.metrics)) {
      return NextResponse.json(
        { error: "metrics must be an array" },
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
      await tx.successMetric.deleteMany({
        where: { project_id: projectId },
      });

      if (body.metrics.length > 0) {
        await tx.successMetric.createMany({
          data: body.metrics.map((m) => ({
            project_id: projectId,
            metric_name: m.name,
            target: m.target ?? null,
            measurement_method: m.measurementMethod ?? null,
            priority: m.priority ?? "medium",
          })),
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin update metrics error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון מדדי ההצלחה" },
      { status: 500 }
    );
  }
}
