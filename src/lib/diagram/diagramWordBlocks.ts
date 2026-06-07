import type { WordExportBlock } from "@/lib/wordExport";
import type { DiagramType } from "@/types/diagram";

export interface DiagramWordImage {
  type?: DiagramType;
  title: string;
  imageData: Uint8Array;
  width: number;
  height: number;
}

interface BuildDiagramWordBlocksOptions {
  includedTypes?: DiagramType[];
}

const MAX_WORD_IMAGE_WIDTH = 550;
const MAX_WORD_IMAGE_HEIGHT = 400;

function scaleDiagramImage(width: number, height: number): { width: number; height: number } {
  let scaledWidth = width;
  let scaledHeight = height;

  if (scaledWidth > MAX_WORD_IMAGE_WIDTH) {
    scaledHeight = Math.round(scaledHeight * (MAX_WORD_IMAGE_WIDTH / scaledWidth));
    scaledWidth = MAX_WORD_IMAGE_WIDTH;
  }
  if (scaledHeight > MAX_WORD_IMAGE_HEIGHT) {
    scaledWidth = Math.round(scaledWidth * (MAX_WORD_IMAGE_HEIGHT / scaledHeight));
    scaledHeight = MAX_WORD_IMAGE_HEIGHT;
  }

  return { width: scaledWidth, height: scaledHeight };
}

export function buildDiagramWordBlocks(
  diagrams: DiagramWordImage[],
  options: BuildDiagramWordBlocksOptions = {}
): WordExportBlock[] {
  const includedTypeSet = options.includedTypes ? new Set(options.includedTypes) : null;
  const includedDiagrams = includedTypeSet
    ? diagrams.filter((diagram) => diagram.type && includedTypeSet.has(diagram.type))
    : diagrams;

  if (includedDiagrams.length === 0) return [];

  return [
    { kind: "space" },
    { kind: "heading", text: "תרשימים" },
    ...includedDiagrams.flatMap((diagram): WordExportBlock[] => {
      const scaled = scaleDiagramImage(diagram.width, diagram.height);
      return [
        { kind: "subheading", text: diagram.title },
        {
          kind: "image",
          imageData: diagram.imageData,
          width: scaled.width,
          height: scaled.height,
        },
      ];
    }),
  ];
}
