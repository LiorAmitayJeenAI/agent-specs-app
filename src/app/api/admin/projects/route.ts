import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updated_at: "desc" },
      include: {
        client: { select: { client_name: true } },
        use_cases: { select: { use_case_id: true } },
        data_sources: { select: { data_source_id: true } },
        glossary: { select: { term_id: true } },
        success_metrics: { select: { success_metric_id: true } },
      },
    });

    const result = projects.map((p) => ({
      projectId: p.project_id,
      clientName: p.client.client_name,
      projectName: p.project_name,
      agentName: p.requested_agent_name,
      authorName: p.document_author_name,
      authorDepartment: p.author_department,
      authorPosition: p.author_position,
      createdAt: p.created_at.toISOString(),
      updatedAt: p.updated_at.toISOString(),
      counts: {
        useCases: p.use_cases.length,
        dataSources: p.data_sources.length,
        concepts: p.glossary.length,
        metrics: p.success_metrics.length,
      },
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin projects list error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת הפרויקטים" },
      { status: 500 }
    );
  }
}
