"use client";

import { buildJpegPdf } from "@/lib/diagram/exportPdfDocument";
import {
  buildNextExportAction,
  DRAWIO_ORIGIN,
  EXPORT_URL,
  isTrustedDrawioOrigin,
  parseDrawioMessage,
  summarizeDrawioMessage,
  type DrawioExportIntent,
} from "@/lib/diagram/exportPdfProtocol";
import {
  prepareDrawioXmlForImageExport,
  prepareDrawioXmlForPdfExport,
} from "@/lib/diagram/exportPdfXml";

const EXPORT_TIMEOUT_MS = 30000;
const EXPORT_IFRAME_WIDTH = 1200;
const EXPORT_IFRAME_HEIGHT = 900;

interface ExportDiagramPdfParams {
  xml: string;
  fileName: string;
}

interface ExportDiagramPngParams {
  xml: string;
  fileName: string;
}

export interface DiagramPngExport {
  imageData: Uint8Array;
  width: number;
  height: number;
}

type DrawioDiagnosticMessage = {
  event: string;
  bounds?: unknown;
  modelBounds?: unknown;
  scale?: unknown;
  translate?: unknown;
  page?: unknown;
  containerSize?: unknown;
  svg?: unknown;
};

function dataUriToBytes(dataUri: string, expectedMimeType: string): Uint8Array {
  const [metadata, data] = dataUri.split(",");
  if (!metadata || !data) {
    throw new Error("Invalid export data");
  }

  const mimeMatch = metadata.match(/^data:([^;]+);base64$/);
  if (!mimeMatch || mimeMatch[1] !== expectedMimeType) {
    throw new Error("Invalid export type");
  }

  const bytes = window.atob(data);
  const buffer = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    buffer[i] = bytes.charCodeAt(i);
  }

  return buffer;
}

function blobPartFromBytes(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function ensureFileExtension(fileName: string, extension: string): string {
  return fileName.toLowerCase().endsWith(extension) ? fileName : `${fileName}${extension}`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function imageDataUriToPng(imageDataUri: string): Promise<DiagramPngExport> {
  return new Promise((resolve, reject) => {
    if (!imageDataUri.startsWith("data:image/png;base64,")) {
      reject(new Error("Invalid image export type"));
      return;
    }

    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (width <= 0 || height <= 0) {
        reject(new Error("Invalid image export size"));
        return;
      }

      resolve({
        imageData: dataUriToBytes(imageDataUri, "image/png"),
        width,
        height,
      });
    };
    image.onerror = () => reject(new Error("Could not load image export"));
    image.src = imageDataUri;
  });
}

function imageDataUriToJpeg(imageDataUri: string): Promise<{
  jpegBytes: Uint8Array;
  imageWidth: number;
  imageHeight: number;
}> {
  return new Promise((resolve, reject) => {
    if (!imageDataUri.startsWith("data:image/")) {
      reject(new Error("Invalid image export type"));
      return;
    }

    const image = new Image();
    image.onload = () => {
      const imageWidth = image.naturalWidth || image.width;
      const imageHeight = image.naturalHeight || image.height;
      if (imageWidth <= 0 || imageHeight <= 0) {
        reject(new Error("Invalid SVG export size"));
        return;
      }

      const canvas = document.createElement("canvas");
      canvas.width = imageWidth;
      canvas.height = imageHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Canvas is not available"));
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, imageWidth, imageHeight);
      context.drawImage(image, 0, 0);

      try {
        const jpegDataUri = canvas.toDataURL("image/jpeg", 0.92);
        resolve({
          jpegBytes: dataUriToBytes(jpegDataUri, "image/jpeg"),
          imageWidth,
          imageHeight,
        });
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Could not render SVG export"));
      }
    };
    image.onerror = () => reject(new Error("Could not load image export"));
    image.src = imageDataUri;
  });
}

async function imageDataUriToPdfBlob(imageDataUri: string): Promise<Blob> {
  const jpeg = await imageDataUriToJpeg(imageDataUri);
  const pdfBytes = buildJpegPdf(jpeg);
  return new Blob([blobPartFromBytes(pdfBytes)], { type: "application/pdf" });
}

function logDrawioExportDiagnostics(message: DrawioDiagnosticMessage) {
  if (process.env.NODE_ENV === "production") return;
  if (message.event !== "load" && message.event !== "export") return;

  console.debug("[drawio-export]", {
    event: message.event,
    bounds: message.bounds,
    modelBounds: message.modelBounds,
    scale: message.scale,
    translate: message.translate,
    page: message.page,
    containerSize: message.containerSize,
    svgLength: typeof message.svg === "string" ? message.svg.length : undefined,
  });
}

function exportDiagramPngDataUri(
  xml: string,
  options: { intent?: DrawioExportIntent } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    const intent = options.intent ?? "image";
    const exportXml = intent === "pdf"
      ? prepareDrawioXmlForPdfExport(xml)
      : prepareDrawioXmlForImageExport(xml);
    let settled = false;
    let lastMessageSummary = "no draw.io message received";

    const cleanup = () => {
      window.removeEventListener("message", handleMessage);
      iframe.remove();
      window.clearTimeout(timeoutId);
    };

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const timeoutId = window.setTimeout(() => {
      settle(() => reject(new Error(`Export timed out (${lastMessageSummary})`)));
    }, EXPORT_TIMEOUT_MS);

    function handleMessage(event: MessageEvent) {
      if (!isTrustedDrawioOrigin(event.origin)) return;

      const message = parseDrawioMessage(event.data);
      if (!message) return;
      lastMessageSummary = summarizeDrawioMessage(message);
      logDrawioExportDiagnostics(message as DrawioDiagnosticMessage);

      if (message.event === "init" || message.event === "load") {
        if (message.event === "load" && typeof message.error === "string") {
          const errorMessage =
            typeof message.message === "string" ? message.message : message.error;
          settle(() => reject(new Error(errorMessage)));
          return;
        }

        const action = buildNextExportAction(message, exportXml, { intent });
        if (!action) return;

        iframe.contentWindow?.postMessage(
          JSON.stringify(action),
          DRAWIO_ORIGIN
        );
        return;
      }

      if (message.event === "export") {
        if (message.format !== "png" || typeof message.data !== "string") {
          const errorMessage =
            typeof message.message === "string"
              ? message.message
              : `Export failed (${lastMessageSummary})`;
          settle(() => reject(new Error(errorMessage)));
          return;
        }

        settle(() => resolve(message.data as string));
      }
    }

    iframe.src = EXPORT_URL;
    iframe.title = "diagram-export";
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = `${EXPORT_IFRAME_WIDTH}px`;
    iframe.style.height = `${EXPORT_IFRAME_HEIGHT}px`;
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.border = "0";

    window.addEventListener("message", handleMessage);
    document.body.appendChild(iframe);
  });
}

export async function exportDiagramPngData({ xml }: { xml: string }): Promise<DiagramPngExport> {
  const imageDataUri = await exportDiagramPngDataUri(xml);
  return imageDataUriToPng(imageDataUri);
}

export async function exportDiagramImage({ xml, fileName }: ExportDiagramPngParams): Promise<void> {
  const png = await exportDiagramPngData({ xml });
  const blob = new Blob([blobPartFromBytes(png.imageData)], { type: "image/png" });
  downloadBlob(blob, ensureFileExtension(fileName, ".png"));
}

export async function exportDiagramPdf({ xml, fileName }: ExportDiagramPdfParams): Promise<void> {
  const imageDataUri = await exportDiagramPngDataUri(xml, { intent: "pdf" });
  const blob = await imageDataUriToPdfBlob(imageDataUri);
  downloadBlob(blob, ensureFileExtension(fileName, ".pdf"));
}
