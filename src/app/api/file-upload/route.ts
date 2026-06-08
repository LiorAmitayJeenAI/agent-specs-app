import { NextRequest, NextResponse } from "next/server";
import { uploadFileToBlob } from "@/lib/azure-storage";
import { durationMs, logError, logInfo, logWarn } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
];

const getTextFormField = (formData: FormData, fieldName: string) => {
  const value = formData.get(fieldName);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  let projectId: string | undefined;
  let stepId: string | undefined;
  let fieldName: string | undefined;
  let fileName: string | undefined;
  let fileSize: number | undefined;
  let mimeType: string | undefined;
  let isSummary = false;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    projectId = getTextFormField(formData, "projectId");
    stepId = getTextFormField(formData, "stepId");
    fieldName = getTextFormField(formData, "fieldName");
    isSummary = formData.get("isSummary") === "true";
    let clientName = getTextFormField(formData, "clientName");
    let requestedAgentName = getTextFormField(formData, "requestedAgentName");
    let documentAuthorName = getTextFormField(formData, "documentAuthorName");

    if (!file) {
      return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 });
    }

    fileName = file.name;
    fileSize = file.size;
    mimeType = file.type;

    if (file.size > MAX_FILE_SIZE) {
      logWarn("file upload rejected: file too large", {
        route: "/api/file-upload",
        method: "POST",
        projectId,
        stepId,
        fieldName,
        fileName,
        fileSize,
        mimeType,
        isSummary,
        maxFileSize: MAX_FILE_SIZE,
      });
      return NextResponse.json(
        { error: `הקובץ גדול מדי. גודל מקסימלי: ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type) && !isSummary) {
      logWarn("file upload rejected: unsupported mime type", {
        route: "/api/file-upload",
        method: "POST",
        projectId,
        stepId,
        fieldName,
        fileName,
        fileSize,
        mimeType,
        isSummary,
      });
      return NextResponse.json(
        { error: "סוג הקובץ אינו נתמך" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (isSummary && projectId && (!clientName || !requestedAgentName || !documentAuthorName)) {
      const project = await prisma.project.findUnique({
        where: { project_id: projectId },
        select: {
          requested_agent_name: true,
          document_author_name: true,
          client: {
            select: { client_name: true },
          },
        },
      });

      clientName ||= project?.client.client_name;
      requestedAgentName ||= project?.requested_agent_name;
      documentAuthorName ||= project?.document_author_name;
    }

    if (isSummary && (!clientName || !requestedAgentName || !documentAuthorName)) {
      return NextResponse.json(
        { error: "חסרים פרטי לקוח, שם סוכן או שם עורך לשמירת מסמך האפיון" },
        { status: 400 }
      );
    }

    let overrideBlobPath: string | undefined;

    if (isSummary && projectId) {
      const existingFile = await prisma.file.findFirst({
        where: {
          related_entity_type: "summary",
          related_entity_id: projectId,
          field_name: fieldName || null,
        },
        select: { blob_url: true },
        orderBy: { uploaded_at: "desc" },
      });

      if (existingFile) {
        overrideBlobPath = existingFile.blob_url;
      }
    }

    const result = await uploadFileToBlob({
      buffer,
      originalFileName: file.name,
      mimeType: file.type,
      projectId,
      stepId,
      fieldName,
      isSummary,
      clientName,
      requestedAgentName,
      documentAuthorName,
      overrideBlobPath,
    });

    const relatedEntityType = isSummary ? "summary" : "upload";
    const relatedEntityId = projectId || "draft";
    const fileData = {
      related_entity_type: relatedEntityType,
      related_entity_id: relatedEntityId,
      file_name: result.fileName,
      file_type: result.mimeType,
      blob_url: result.blobPath,
      size: result.size,
      step_id: stepId || null,
      field_name: fieldName || null,
    };

    let savedFile;

    if (isSummary && projectId) {
      const existing = await prisma.file.findFirst({
        where: {
          related_entity_type: "summary",
          related_entity_id: projectId,
          field_name: fieldName || null,
        },
        orderBy: { uploaded_at: "desc" },
      });

      if (existing) {
        savedFile = await prisma.file.update({
          where: { file_id: existing.file_id },
          data: { ...fileData, uploaded_at: new Date() },
        });
      } else {
        savedFile = await prisma.file.create({ data: fileData });
      }
    } else {
      savedFile = await prisma.file.create({ data: fileData });
    }

    logInfo("file uploaded", {
      route: "/api/file-upload",
      method: "POST",
      projectId,
      stepId,
      fieldName,
      fileId: savedFile.file_id,
      fileName: result.fileName,
      fileSize: result.size,
      mimeType: result.mimeType,
      relatedEntityType,
      isSummary,
      durationMs: durationMs(startedAt),
    });

    return NextResponse.json({
      fileId: savedFile.file_id,
      blobPath: result.blobPath,
      blobUrl: result.blobUrl,
      originalFileName: result.fileName,
      mimeType: result.mimeType,
      size: result.size,
      fieldName: fieldName || null,
      stepId: stepId || null,
    });
  } catch (error) {
    logError("file upload failed", error, {
      route: "/api/file-upload",
      method: "POST",
      projectId,
      stepId,
      fieldName,
      fileName,
      fileSize,
      mimeType,
      isSummary,
      durationMs: durationMs(startedAt),
    });
    return NextResponse.json(
      { error: "אירעה שגיאה בהעלאת הקובץ" },
      { status: 500 }
    );
  }
}
