"use client";

import { buildDiagramWordBlocks, type DiagramWordImage } from "@/lib/diagram/diagramWordBlocks";
import { exportDiagramPngData } from "@/lib/diagram/exportPdfClient";
import type { DiagramMeta, DiagramType, ProjectDiagramsResponse } from "@/types/diagram";

const DIAGRAM_ORDER: Array<{ type: DiagramType; title: string }> = [
  { type: "flow", title: "תרשים תהליך" },
  { type: "architecture", title: "תרשים ארכיטקטורה" },
];

function cacheBustedUrl(url: string, version: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(version)}`;
}

async function loadDiagramXml(meta: DiagramMeta): Promise<string> {
  const response = await fetch(cacheBustedUrl(meta.proxyUrl, meta.generatedAt));
  if (!response.ok) {
    throw new Error("Diagram XML fetch failed");
  }

  return response.text();
}

async function resolveDiagramImage(
  type: DiagramType,
  title: string,
  meta: DiagramMeta
): Promise<DiagramWordImage> {
  const xml = await loadDiagramXml(meta);
  const png = await exportDiagramPngData({ xml });
  return {
    type,
    title,
    imageData: png.imageData,
    width: png.width,
    height: png.height,
  };
}

export async function resolveDiagramWordBlocks(
  projectId: string | null,
  includedTypes?: DiagramType[]
): Promise<ReturnType<typeof buildDiagramWordBlocks>> {
  if (!projectId) return [];

  const response = await fetch(`/api/projects/${projectId}/diagrams`);
  if (!response.ok) return [];

  const diagrams = (await response.json()) as ProjectDiagramsResponse;
  const images: DiagramWordImage[] = [];
  const includedTypeSet = includedTypes ? new Set(includedTypes) : null;

  for (const { type, title } of DIAGRAM_ORDER) {
    if (includedTypeSet && !includedTypeSet.has(type)) continue;

    const meta = diagrams[type];
    if (!meta) continue;

    try {
      images.push(await resolveDiagramImage(type, title, meta));
    } catch (error) {
      console.warn(`Skipping ${type} diagram in Word export`, error);
    }
  }

  return buildDiagramWordBlocks(images);
}
