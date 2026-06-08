import { NextRequest, NextResponse } from "next/server";
import { copyBlobInContainer } from "@/lib/azure-storage";
import { durationMs, logError, logInfo } from "@/lib/logger";

interface CompanionFileRequest {
  files: { sourceBlobPath: string; fileName: string }[];
  targetFolder: string;
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  let targetFolder: string | undefined;
  let requestedFiles: number | undefined;

  try {
    const body: CompanionFileRequest = await request.json();
    targetFolder = body.targetFolder;
    requestedFiles = Array.isArray(body.files) ? body.files.length : undefined;

    if (!body.files || !Array.isArray(body.files) || !body.targetFolder) {
      return NextResponse.json(
        { error: "Missing files or targetFolder" },
        { status: 400 }
      );
    }

    const results: { blobPath: string; blobUrl: string }[] = [];

    for (const file of body.files) {
      if (!file.sourceBlobPath || !file.fileName) continue;

      const destPath = `${body.targetFolder}/${file.fileName}`;
      try {
        const result = await copyBlobInContainer(
          file.sourceBlobPath,
          destPath
        );
        results.push(result);
      } catch (err) {
        logError("companion file copy failed", err, {
          route: "/api/copy-companion-files",
          method: "POST",
          sourceBlobPath: file.sourceBlobPath,
          destPath,
          targetFolder,
        });
      }
    }

    logInfo("companion files copied", {
      route: "/api/copy-companion-files",
      method: "POST",
      targetFolder,
      requestedFiles,
      copiedFiles: results.length,
      durationMs: durationMs(startedAt),
    });

    return NextResponse.json({ success: true, copied: results.length });
  } catch (error) {
    logError("copy companion files failed", error, {
      route: "/api/copy-companion-files",
      method: "POST",
      targetFolder,
      requestedFiles,
      durationMs: durationMs(startedAt),
    });
    return NextResponse.json(
      { error: "Failed to copy companion files" },
      { status: 500 }
    );
  }
}
