import { NextRequest, NextResponse } from "next/server";
import { durationMs, logError, logInfo } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

interface CreateProjectStubBody {
  clientName: string;
  projectManagerName: string;
  projectName: string;
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  let clientName: string | undefined;
  let projectName: string | undefined;

  try {
    const body: CreateProjectStubBody = await request.json();
    clientName = body.clientName;
    projectName = body.projectName;

    if (!body.clientName?.trim()) {
      return NextResponse.json(
        { error: "שם לקוח הוא שדה חובה" },
        { status: 400 }
      );
    }

    const client =
      (await prisma.client.findFirst({
        where: { client_name: body.clientName.trim() },
        select: { client_id: true },
      })) ??
      (await prisma.client.create({
        data: { client_name: body.clientName.trim() },
        select: { client_id: true },
      }));

    const project = await prisma.project.create({
      data: {
        client_id: client.client_id,
        project_name: body.projectName?.trim() || "",
        project_manager_name: body.projectManagerName?.trim() || null,
        document_author_name: "",
        requested_agent_name: "",
        short_agent_description: "",
        status: "sent_to_client",
      },
      select: { project_id: true },
    });

    logInfo("admin project created", {
      route: "/api/admin/projects",
      method: "POST",
      projectId: project.project_id,
      clientName,
      projectName,
      durationMs: durationMs(startedAt),
    });

    return NextResponse.json({ projectId: project.project_id });
  } catch (error) {
    logError("admin project create failed", error, {
      route: "/api/admin/projects",
      method: "POST",
      clientName,
      projectName,
      durationMs: durationMs(startedAt),
    });
    return NextResponse.json(
      { error: "שגיאה ביצירת הפרויקט" },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  const startedAt = performance.now();

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
      projectManagerName: p.project_manager_name,
      agentName: p.requested_agent_name,
      authorName: p.document_author_name,
      authorDepartment: p.author_department,
      authorPosition: p.author_position,
      status: p.status,
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
    logError("admin projects list failed", error, {
      route: "/api/admin/projects",
      method: "GET",
      durationMs: durationMs(startedAt),
    });
    return NextResponse.json(
      { error: "שגיאה בטעינת הפרויקטים" },
      { status: 500 }
    );
  }
}
