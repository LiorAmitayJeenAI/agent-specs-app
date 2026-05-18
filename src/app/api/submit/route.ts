import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { FormOutput } from "@/types";

const ALLOWED_CUSTOMERS = [
  "מכבי שירותי בריאות",
  "חברת חשמל לישראל",
  "ישראכרט",
  "ביטוח ישיר",
];

const hasText = (value: string | undefined) => Boolean(value?.trim());

export async function POST(request: NextRequest) {
  try {
    const body: FormOutput = await request.json();

    // ── Validate minimum data ──────────────────────────────────────────────
    if (
      !body.projectIntake?.clientName ||
      !body.projectIntake?.documentAuthorName ||
      !body.agentDetails?.requestedAgentName ||
      !body.agentDetails?.shortAgentDescription
    ) {
      return NextResponse.json(
        { error: "חסרים פרטי לקוח, עורך מסמך או סוכן" },
        { status: 400 }
      );
    }

    if (!ALLOWED_CUSTOMERS.includes(body.projectIntake.clientName)) {
      return NextResponse.json(
        { error: "שם הלקוח אינו ברשימת הלקוחות המורשים" },
        { status: 400 }
      );
    }

    if (!body.useCases || body.useCases.length === 0) {
      return NextResponse.json(
        { error: "חייב להיות לפחות תרחיש שימוש אחד" },
        { status: 400 }
      );
    }

    if (
      body.useCases.some(
        (useCase) =>
          useCase.flowSteps.length === 0 ||
          useCase.flowSteps.some((step) => !hasText(step.description))
      )
    ) {
      return NextResponse.json(
        { error: "יש למלא פירוט התהליך הקיים (Flow) בכל תרחיש שימוש" },
        { status: 400 }
      );
    }

    const existingClient = await prisma.client.findFirst({
      where: { client_name: body.projectIntake.clientName },
      select: { client_id: true },
    });

    const client =
      existingClient ??
      (await prisma.client.create({
        data: {
          client_name: body.projectIntake.clientName,
        },
        select: { client_id: true },
      }));

    const savedProject = await prisma.project.create({
      data: {
        client_id: client.client_id,
        project_name: body.agentDetails.requestedAgentName,
        document_author_name: body.projectIntake.documentAuthorName,
        author_department: body.projectIntake.department || null,
        author_position: body.projectIntake.position || null,
        requested_agent_name: body.agentDetails.requestedAgentName,
        short_agent_description: body.agentDetails.shortAgentDescription,
        use_cases: {
          create: body.useCases.map((useCase, index) => ({
            use_case_name:
              useCase.useCaseName.trim() ||
              useCase.qaPairs?.[0]?.question?.trim() ||
              `תרחיש שימוש ${index + 1}`,
            title: useCase.title || null,
            user_question: useCase.qaPairs?.[0]?.question || null,
            expected_answer: useCase.qaPairs?.[0]?.expectedAnswer || null,
            performed_by: useCase.performer || null,
            current_systems: useCase.systemsInvolved,
            notes: useCase.additionalNotes || null,
            qa_pairs: {
              create: (useCase.qaPairs ?? [])
                .filter((pair) => pair.question.trim() || pair.expectedAnswer.trim())
                .map((pair, i) => ({
                  order: i + 1,
                  question: pair.question,
                  expected_answer: pair.expectedAnswer,
                  data_source_ref: pair.dataSourceRef || null,
                  data_source_id: pair.dataSourceId || null,
                })),
            },
            flow_steps: {
              create: useCase.flowSteps.map((step) => ({
                step_number: step.order,
                step_description: step.description,
                has_calculation: step.hasCalculation,
                calculation_details: step.calculationDetails || null,
              })),
            },
          })),
        },
        data_sources: {
          create: body.dataSources
            .filter(
              (source) =>
                hasText(source.name) ||
                hasText(source.type) ||
                hasText(source.description) ||
                hasText(source.accessMethod)
            )
            .map((source) => ({
              source_name: source.name || "מקור מידע ללא שם",
              source_type: source.type || null,
              description: source.description || null,
              access_method: source.accessMethod || null,
            })),
        },
        glossary: {
          create: body.concepts
            .filter(
              (concept) =>
                hasText(concept.term) ||
                hasText(concept.definition) ||
                hasText(concept.examples)
            )
            .map((concept) => ({
              term: concept.term || "מושג ללא שם",
              definition: concept.definition || null,
              examples: concept.examples || null,
            })),
        },
        success_metrics: {
          create: body.successMetrics
            .filter(
              (metric) =>
                hasText(metric.metric) ||
                hasText(metric.target) ||
                hasText(metric.measurementMethod)
            )
            .map((metric) => ({
              metric_name: metric.metric || "מדד ללא שם",
              target: metric.target || null,
              measurement_method: metric.measurementMethod || null,
              priority: metric.priority,
            })),
        },
        requirement_documents: {
          create: {
            title: "מסמך אפיון סוכן AI",
            content_json: body as unknown as Prisma.InputJsonValue,
          },
        },
      },
      select: {
        project_id: true,
        client_id: true,
      },
    });

    // Link uploaded files to this project
    if (body.uploadedFiles && body.uploadedFiles.length > 0) {
      const fileIds = body.uploadedFiles
        .map((f) => f.fileId)
        .filter(Boolean);

      if (fileIds.length > 0) {
        await prisma.file.updateMany({
          where: { file_id: { in: fileIds } },
          data: { related_entity_id: savedProject.project_id },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "הנתונים התקבלו בהצלחה",
        projectId: savedProject.project_id,
        clientId: savedProject.client_id,
        summary: {
          clientName: body.projectIntake.clientName,
          documentAuthorName: body.projectIntake.documentAuthorName,
          requestedAgentName: body.agentDetails.requestedAgentName,
          useCases: body.useCases.length,
          dataSources: body.dataSources.length,
          concepts: body.concepts.length,
          successMetrics: body.successMetrics.length,
          totalFlowSteps: body.useCases.reduce((s, uc) => s + uc.flowSteps.length, 0),
          submittedAt: body.submittedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "אירעה שגיאה בעיבוד הבקשה" },
      { status: 500 }
    );
  }
}
