import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAdminToken } from "@/lib/admin-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyAdminToken(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: { project_id: id },
      include: {
        client: true,
        use_cases: {
          include: {
            flow_steps: { orderBy: { step_number: "asc" } },
            qa_pairs: { orderBy: { order: "asc" } },
          },
        },
        data_sources: true,
        glossary: true,
        success_metrics: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "הפרויקט לא נמצא" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      projectId: project.project_id,
      clientName: project.client.client_name,
      projectName: project.project_name,
      authorName: project.document_author_name,
      authorDepartment: project.author_department,
      authorPosition: project.author_position,
      agentName: project.requested_agent_name,
      agentDescription: project.short_agent_description,
      createdAt: project.created_at.toISOString(),
      useCases: project.use_cases.map((uc) => ({
        id: uc.use_case_id,
        name: uc.use_case_name,
        title: uc.title,
        performedBy: uc.performed_by,
        systems: uc.current_systems,
        notes: uc.notes,
        qaPairs: uc.qa_pairs.map((qa) => ({
          id: qa.qa_pair_id,
          order: qa.order,
          question: qa.question,
          expectedAnswer: qa.expected_answer,
          dataSourceRef: qa.data_source_ref,
        })),
        flowSteps: uc.flow_steps.map((fs) => ({
          id: fs.step_id,
          order: fs.step_number,
          description: fs.step_description,
          hasCalculation: fs.has_calculation,
          calculationDetails: fs.calculation_details,
        })),
      })),
      dataSources: project.data_sources.map((ds) => ({
        id: ds.data_source_id,
        name: ds.source_name,
        type: ds.source_type,
        description: ds.description,
        accessMethod: ds.access_method,
      })),
      concepts: project.glossary.map((g) => ({
        id: g.term_id,
        term: g.term,
        definition: g.definition,
        examples: g.examples,
      })),
      metrics: project.success_metrics.map((m) => ({
        id: m.success_metric_id,
        name: m.metric_name,
        target: m.target,
        measurementMethod: m.measurement_method,
        priority: m.priority,
      })),
    });
  } catch (error) {
    console.error("Admin project detail error:", error);
    return NextResponse.json(
      { error: "שגיאה בטעינת הפרויקט" },
      { status: 500 }
    );
  }
}
