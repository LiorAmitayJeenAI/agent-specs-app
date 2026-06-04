export const EXPORT_URL = "https://embed.diagrams.net/?embed=1&proto=json";
export const DRAWIO_ORIGIN = "https://embed.diagrams.net";
const TRUSTED_DRAWIO_ORIGINS = new Set([
  "https://embed.diagrams.net",
  "https://app.diagrams.net",
  "https://viewer.diagrams.net",
]);

export type DrawioExportMessage =
  | { event: "init" }
  | { event: "load"; error?: string; message?: string }
  | { event: "export"; format?: string; data?: string; message?: string }
  | { event: string; [key: string]: unknown };

export type DrawioExportIntent = "image" | "pdf";

export type DrawioExportAction =
  | {
      action: "load";
      xml: string;
      noExitBtn: 1;
      noSaveBtn: 1;
    }
  | {
      action: "export";
      border: 20;
      format: "png";
      spinKey: "export";
      xml: string;
    }
  | {
      action: "export";
      border: 0;
      format: "png";
      scale: 1;
      size: "diagram";
      spinKey: "export";
      transparent: true;
      withSvg: true;
    };

export function isTrustedDrawioOrigin(origin: string): boolean {
  return TRUSTED_DRAWIO_ORIGINS.has(origin);
}

export function summarizeDrawioMessage(message: DrawioExportMessage): string {
  const parts = [`event=${message.event}`];

  if ("format" in message && typeof message.format === "string") {
    parts.push(`format=${message.format}`);
  }
  if ("error" in message && typeof message.error === "string") {
    parts.push(`error=${message.error}`);
  }
  if ("message" in message && typeof message.message === "string") {
    parts.push(`message=${message.message}`);
  }

  return parts.join(" ");
}

export function parseDrawioMessage(data: unknown): DrawioExportMessage | null {
  if (typeof data === "string") {
    try {
      return JSON.parse(data) as DrawioExportMessage;
    } catch {
      return null;
    }
  }

  if (typeof data === "object" && data !== null && "event" in data) {
    return data as DrawioExportMessage;
  }

  return null;
}

export function buildNextExportAction(
  message: DrawioExportMessage,
  xml: string,
  options: { intent?: DrawioExportIntent } = {}
): DrawioExportAction | null {
  if (message.event === "init") {
    return {
      action: "load",
      xml,
      noExitBtn: 1,
      noSaveBtn: 1,
    };
  }

  if (message.event === "load") {
    if (options.intent === "image") {
      return {
        action: "export",
        border: 0,
        format: "png",
        scale: 1,
        size: "diagram",
        spinKey: "export",
        transparent: true,
        withSvg: true,
      };
    }

    return {
      action: "export",
      border: 20,
      format: "png",
      spinKey: "export",
      xml,
    };
  }

  return null;
}
