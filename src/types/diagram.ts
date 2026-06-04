export type DiagramType = "flow" | "architecture";

export interface DiagramMeta {
  fileId: string;
  proxyUrl: string;
  fileName: string;
  generatedAt: string;
  specHash: string;
  isStale: boolean;
}

export interface ProjectDiagramsResponse {
  flow: DiagramMeta | null;
  architecture: DiagramMeta | null;
}

export interface GenerateDiagramRequest {
  type: DiagramType;
  /** When admin UI shows completed but DB is stale, sync status before generating */
  syncStatus?: "completed";
}

export interface GenerateDiagramResponse {
  diagram: DiagramMeta;
}

export interface SaveDiagramRequest {
  type: DiagramType;
  xml: string;
}

export interface SaveDiagramResponse {
  diagram: DiagramMeta;
}
