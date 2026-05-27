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

function buildUseCasesData(body: FormOutput) {
  return body.useCases.map((useCase, index) => ({
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
  }));
}

function buildDataSourcesData(body: FormOutput) {
  return body.dataSources
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
    }));
}

function buildGlossaryData(body: FormOutput) {
  return body.concepts
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
    }));
}

function buildMetricsData(body: FormOutput) {
  return body.successMetrics
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
    }));
}

export async function POST(request: NextRequest) {
  try {
    const body: FormOutput = await request.json();

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

    const client =
      (await prisma.client.findFirst({
        where: { client_name: body.projectIntake.clientName },
        select: { client_id: true },
      })) ??
      (await prisma.client.create({
        data: { client_name: body.projectIntake.clientName },
        select: { client_id: true },
      }));

    let savedProjectId: string;
    let savedClientId: string;

    if (body.projectId) {
      const existing = await prisma.project.findUnique({
        where: { project_id: body.projectId },
        select: { project_id: true },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "הפרויקט לא נמצא" },
          { status: 404 }
        );
      }

      await prisma.$transaction(async (tx) => {
        await tx.successMetric.deleteMany({ where: { project_id: body.projectId! } });
        await tx.flowStep.deleteMany({
          where: { use_case: { project_id: body.projectId! } },
        });
        await tx.useCaseQAPair.deleteMany({
          where: { use_case: { project_id: body.projectId! } },
        });
        await tx.useCase.deleteMany({ where: { project_id: body.projectId! } });
        await tx.dataSource.deleteMany({ where: { project_id: body.projectId! } });
        await tx.glossaryTerm.deleteMany({ where: { project_id: body.projectId! } });
        await tx.requirementDocument.deleteMany({ where: { project_id: body.projectId! } });

        await tx.project.update({
          where: { project_id: body.projectId! },
          data: {
            client_id: client.client_id,
            project_name: body.agentDetails.requestedAgentName,
            document_author_name: body.projectIntake.documentAuthorName,
            author_department: body.projectIntake.department || null,
            author_position: body.projectIntake.position || null,
            requested_agent_name: body.agentDetails.requestedAgentName,
            short_agent_description: body.agentDetails.shortAgentDescription,
            status: "client_draft",
            use_cases: { create: buildUseCasesData(body) },
            data_sources: { create: buildDataSourcesData(body) },
            glossary: { create: buildGlossaryData(body) },
            success_metrics: { create: buildMetricsData(body) },
            requirement_documents: {
              create: {
                title: "מסמך אפיון סוכן AI",
                content_json: body as unknown as Prisma.InputJsonValue,
              },
            },
          },
        });
      });

      savedProjectId = body.projectId;
      savedClientId = client.client_id;
    } else {
      const savedProject = await prisma.project.create({
        data: {
          client_id: client.client_id,
          project_name: body.agentDetails.requestedAgentName,
          document_author_name: body.projectIntake.documentAuthorName,
          author_department: body.projectIntake.department || null,
          author_position: body.projectIntake.position || null,
          requested_agent_name: body.agentDetails.requestedAgentName,
          short_agent_description: body.agentDetails.shortAgentDescription,
          status: "client_draft",
          use_cases: { create: buildUseCasesData(body) },
          data_sources: { create: buildDataSourcesData(body) },
          glossary: { create: buildGlossaryData(body) },
          success_metrics: { create: buildMetricsData(body) },
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

      savedProjectId = savedProject.project_id;
      savedClientId = savedProject.client_id;
    }

    if (body.uploadedFiles && body.uploadedFiles.length > 0) {
      const fileIds = body.uploadedFiles
        .map((f) => f.fileId)
        .filter(Boolean);

      if (fileIds.length > 0) {
        await prisma.file.updateMany({
          where: { file_id: { in: fileIds } },
          data: { related_entity_id: savedProjectId },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "הנתונים התקבלו בהצלחה",
        projectId: savedProjectId,
        clientId: savedClientId,
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
