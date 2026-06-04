import { prisma } from "@/lib/prisma";
import { uploadFileToBlob } from "@/lib/azure-storage";
import type { DiagramMeta, DiagramType } from "@/types/diagram";

const MIME = "application/vnd.jgraph.mxfile";

function diagramFileName(type: DiagramType): string {
  return type === "flow" ? "diagram-flow.drawio" : "diagram-architecture.drawio";
}

function diagramBlobPath(projectId: string, type: DiagramType): string {
  const folder = process.env.AZURE_STORAGE_FOLDER_NAME;
  const base = folder ? `${folder}/` : "";
  return `${base}diagrams/${projectId}/${type}.drawio`;
}

export async function persistDiagram(params: {
  projectId: string;
  type: DiagramType;
  xml: string;
  specHash: string;
}): Promise<DiagramMeta> {
  const { projectId, type, xml, specHash } = params;
  const buffer = Buffer.from(xml, "utf-8");
  const fileName = diagramFileName(type);
  const overrideBlobPath = diagramBlobPath(projectId, type);

  const result = await uploadFileToBlob({
    buffer,
    originalFileName: fileName,
    mimeType: MIME,
    projectId,
    overrideBlobPath,
  });

  const fileData = {
    related_entity_type: "diagram",
    related_entity_id: projectId,
    file_name: fileName,
    file_type: MIME,
    blob_url: result.blobPath,
    size: result.size,
    field_name: type,
    spec_hash: specHash,
  };

  const existing = await prisma.file.findFirst({
    where: {
      related_entity_type: "diagram",
      related_entity_id: projectId,
      field_name: type,
    },
    orderBy: { uploaded_at: "desc" },
  });

  const saved = existing
    ? await prisma.file.update({
        where: { file_id: existing.file_id },
        data: { ...fileData, uploaded_at: new Date() },
      })
    : await prisma.file.create({ data: fileData });

  return {
    fileId: saved.file_id,
    proxyUrl: `/api/file-proxy?path=${encodeURIComponent(result.blobPath)}`,
    fileName,
    generatedAt: saved.uploaded_at.toISOString(),
    specHash,
    isStale: false,
  };
}
