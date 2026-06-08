import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { deleteBlobByPath, deleteBlobsByPrefix, sanitizeFileName } from "@/lib/azure-storage";
import { durationMs, logError, logInfo } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

interface AdminProjectPayload {
  clientName: string;
  projectName: string;
  authorName: string;
  authorDepartment?: string | null;
  authorPosition?: string | null;
  agentName: string;
  agentDescription: string;
  status?: ProjectStatus;
  useCases: {
    name: string;
    title?: string | null;
    performedBy?: string | null;
    systems: string[];
    notes?: string | null;
    qaPairs: {
      question: string;
      expectedAnswer: string;
      dataSourceRef?: string | null;
    }[];
    flowSteps: {
      order: number;
      description: string;
      hasCalculation: boolean;
      calculationDetails?: string | null;
    }[];
  }[];
  dataSources: {
    name: string;
    type?: string | null;
    description?: string | null;
    accessMethod?: string | null;
  }[];
  concepts: {
    term: string;
    definition?: string | null;
    examples?: string | null;
  }[];
  metrics: {
    name: string;
    target?: string | null;
    measurementMethod?: string | null;
    priority?: string;
  }[];
}

type ProjectStatus =
  | "sent_to_client"
  | "client_draft"
  | "pm_review"
  | "completed";

const PROJECT_STATUSES: ProjectStatus[] = [
  "sent_to_client",
  "client_draft",
  "pm_review",
  "completed",
];

const hasText = (value: string | null | undefined) => Boolean(value?.trim());

function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && PROJECT_STATUSES.includes(value as ProjectStatus);
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
        requirement_documents: { select: { requirement_document_id: true } },
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
      projectManagerName: project.project_manager_name,
      authorName: project.document_author_name,
      authorDepartment: project.author_department,
      authorPosition: project.author_position,
      status: project.status,
      agentName: project.requested_agent_name,
      agentDescription: project.short_agent_description,
      createdAt: project.created_at.toISOString(),
      requirementDocumentCount: project.requirement_documents.length,
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
    logError("admin project detail load failed", error, {
      route: "/api/admin/projects/[id]",
      method: "GET",
      projectId: id,
      durationMs: durationMs(startedAt),
    });
    return NextResponse.json(
      { error: "שגיאה בטעינת הפרויקט" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = performance.now();
  const { id: projectId } = await params;
  let nextStatus: ProjectStatus | undefined;
  let useCaseCount: number | undefined;
  let dataSourceCount: number | undefined;
  let conceptCount: number | undefined;
  let metricCount: number | undefined;

  try {
    const body: AdminProjectPayload = await request.json();
    nextStatus = body.status;
    useCaseCount = body.useCases?.length;
    dataSourceCount = body.dataSources?.length;
    conceptCount = body.concepts?.length;
    metricCount = body.metrics?.length;

    if (
      !hasText(body.clientName) ||
      !hasText(body.authorName) ||
      !hasText(body.agentName) ||
      !hasText(body.agentDescription)
    ) {
      return NextResponse.json(
        { error: "חסרים פרטי לקוח, עורך מסמך או סוכן" },
        { status: 400 }
      );
    }

    if (body.status !== undefined && !isProjectStatus(body.status)) {
      return NextResponse.json(
        { error: "סטטוס הפרויקט אינו חוקי" },
        { status: 400 }
      );
    }

    const existingProject = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { project_id: true, status: true },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "הפרויקט לא נמצא" }, { status: 404 });
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

    await prisma.$transaction(async (tx) => {
      await tx.successMetric.deleteMany({ where: { project_id: projectId } });
      await tx.flowStep.deleteMany({
        where: { use_case: { project_id: projectId } },
      });
      await tx.useCaseQAPair.deleteMany({
        where: { use_case: { project_id: projectId } },
      });
      await tx.useCase.deleteMany({ where: { project_id: projectId } });
      await tx.dataSource.deleteMany({ where: { project_id: projectId } });
      await tx.glossaryTerm.deleteMany({ where: { project_id: projectId } });

      await tx.project.update({
        where: { project_id: projectId },
        data: {
          client_id: client.client_id,
          project_name:
            body.projectName?.trim() || body.agentName.trim() || "אפיון סוכן AI",
          document_author_name: body.authorName.trim(),
          author_department: body.authorDepartment?.trim() || null,
          author_position: body.authorPosition?.trim() || null,
          requested_agent_name: body.agentName.trim(),
          short_agent_description: body.agentDescription.trim(),
          status: body.status ?? existingProject.status,
          use_cases: {
            create: body.useCases
              .filter(
                (useCase) =>
                  hasText(useCase.name) ||
                  hasText(useCase.title) ||
                  hasText(useCase.performedBy) ||
                  hasText(useCase.notes) ||
                  useCase.qaPairs.some(
                    (pair) => hasText(pair.question) || hasText(pair.expectedAnswer)
                  ) ||
                  useCase.flowSteps.some((step) => hasText(step.description))
              )
              .map((useCase, index) => ({
                use_case_name:
                  useCase.name?.trim() ||
                  useCase.qaPairs.find((pair) => hasText(pair.question))?.question ||
                  `תרחיש שימוש ${index + 1}`,
                title: useCase.title?.trim() || null,
                user_question:
                  useCase.qaPairs.find((pair) => hasText(pair.question))?.question ??
                  null,
                expected_answer:
                  useCase.qaPairs.find((pair) => hasText(pair.expectedAnswer))
                    ?.expectedAnswer ?? null,
                performed_by: useCase.performedBy?.trim() || null,
                current_systems: useCase.systems.filter(hasText),
                notes: useCase.notes?.trim() || null,
                qa_pairs: {
                  create: useCase.qaPairs
                    .filter(
                      (pair) =>
                        hasText(pair.question) ||
                        hasText(pair.expectedAnswer) ||
                        hasText(pair.dataSourceRef)
                    )
                    .map((pair, pairIndex) => ({
                      order: pairIndex + 1,
                      question: pair.question?.trim() || "-",
                      expected_answer: pair.expectedAnswer?.trim() || "-",
                      data_source_ref: pair.dataSourceRef?.trim() || null,
                    })),
                },
                flow_steps: {
                  create: useCase.flowSteps
                    .filter((step) => hasText(step.description))
                    .map((step, stepIndex) => ({
                      step_number: stepIndex + 1,
                      step_description: step.description.trim(),
                      has_calculation: step.hasCalculation,
                      calculation_details: step.hasCalculation
                        ? step.calculationDetails?.trim() || null
                        : null,
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
                source_name: source.name?.trim() || "מקור מידע ללא שם",
                source_type: source.type?.trim() || null,
                description: source.description?.trim() || null,
                access_method: source.accessMethod?.trim() || null,
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
                term: concept.term?.trim() || "מושג ללא שם",
                definition: concept.definition?.trim() || null,
                examples: concept.examples?.trim() || null,
              })),
          },
          success_metrics: {
            create: body.metrics
              .filter(
                (metric) =>
                  hasText(metric.name) ||
                  hasText(metric.target) ||
                  hasText(metric.measurementMethod)
              )
              .map((metric) => ({
                metric_name: metric.name?.trim() || "מדד ללא שם",
                target: metric.target?.trim() || null,
                measurement_method: metric.measurementMethod?.trim() || null,
                priority: metric.priority || "medium",
              })),
          },
        },
      });

      await tx.requirementDocument.create({
        data: {
          project_id: projectId,
          title: "מסמך אפיון סוכן AI",
          content_json: body as unknown as Prisma.InputJsonValue,
        },
      });
    });

    logInfo("admin project updated", {
      route: "/api/admin/projects/[id]",
      method: "PUT",
      projectId,
      status: nextStatus ?? existingProject.status,
      useCaseCount,
      dataSourceCount,
      conceptCount,
      metricCount,
      durationMs: durationMs(startedAt),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("admin project update failed", error, {
      route: "/api/admin/projects/[id]",
      method: "PUT",
      projectId,
      status: nextStatus,
      useCaseCount,
      dataSourceCount,
      conceptCount,
      metricCount,
      durationMs: durationMs(startedAt),
    });
    return NextResponse.json(
      { error: "שגיאה בעדכון הפרויקט" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = performance.now();
  const { id: projectId } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: { project_id: projectId },
      include: { client: { select: { client_name: true } } },
    });

    if (!project) {
      return NextResponse.json({ error: "הפרויקט לא נמצא" }, { status: 404 });
    }

    let blobCount = 0;
    const skipExternalDeletion = process.env.E2E_DISABLE_EXTERNAL_SERVICES === "true";

    if (!skipExternalDeletion) {
      // Delete blobs from Azure
      const files = await prisma.file.findMany({
        where: { related_entity_id: projectId },
        select: { blob_url: true },
      });
      blobCount = files.length;

      const blobDeletions: Promise<void>[] = files
        .filter((f) => f.blob_url)
        .map((f) => deleteBlobByPath(f.blob_url).catch((err) => {
          logError("project blob delete failed", err, {
            route: "/api/admin/projects/[id]",
            method: "DELETE",
            projectId,
            blobPath: f.blob_url,
          });
        }));

      const folderName = process.env.AZURE_STORAGE_FOLDER_NAME;

      // Delete uploads folder: {folder}/inquiries/{projectId}/
      const uploadsPrefix = folderName
        ? `${folderName}/inquiries/${projectId}/`
        : `inquiries/${projectId}/`;
      blobDeletions.push(
        deleteBlobsByPrefix(uploadsPrefix).catch((err) => {
          logError("project upload folder delete failed", err, {
            route: "/api/admin/projects/[id]",
            method: "DELETE",
            projectId,
            prefix: uploadsPrefix,
          });
        }) as Promise<void>
      );

      // Delete summary folder: {folder}/{clientName}/{agentName}/
      if (project.client.client_name && project.requested_agent_name) {
        const safeClientName = sanitizeFileName(project.client.client_name);
        const safeAgentName = sanitizeFileName(project.requested_agent_name);
        const summaryRoot = folderName ? `${folderName}/` : "lior/";
        const summaryPrefix = `${summaryRoot}${safeClientName}/${safeAgentName}/`;
        blobDeletions.push(
          deleteBlobsByPrefix(summaryPrefix).catch((err) => {
            logError("project summary folder delete failed", err, {
              route: "/api/admin/projects/[id]",
              method: "DELETE",
              projectId,
              prefix: summaryPrefix,
            });
          }) as Promise<void>
        );
      }

      await Promise.all(blobDeletions);
    }

    // Delete all DB records in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.file.deleteMany({ where: { related_entity_id: projectId } });
      await tx.requirementDocument.deleteMany({ where: { project_id: projectId } });
      await tx.successMetric.deleteMany({ where: { project_id: projectId } });
      await tx.flowStep.deleteMany({ where: { use_case: { project_id: projectId } } });
      await tx.useCaseQAPair.deleteMany({ where: { use_case: { project_id: projectId } } });
      await tx.useCase.deleteMany({ where: { project_id: projectId } });
      await tx.dataSource.deleteMany({ where: { project_id: projectId } });
      await tx.glossaryTerm.deleteMany({ where: { project_id: projectId } });
      await tx.project.delete({ where: { project_id: projectId } });
    });

    logInfo("admin project deleted", {
      route: "/api/admin/projects/[id]",
      method: "DELETE",
      projectId,
      blobCount,
      externalDeletionSkipped: skipExternalDeletion,
      durationMs: durationMs(startedAt),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logError("admin project delete failed", error, {
      route: "/api/admin/projects/[id]",
      method: "DELETE",
      projectId,
      durationMs: durationMs(startedAt),
    });
    return NextResponse.json(
      { error: "שגיאה במחיקת הפרויקט" },
      { status: 500 }
    );
  }
}
