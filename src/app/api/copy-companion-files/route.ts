import { NextRequest, NextResponse } from "next/server";
import { copyBlobInContainer } from "@/lib/azure-storage";

interface CompanionFileRequest {
  files: { sourceBlobPath: string; fileName: string }[];
  targetFolder: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CompanionFileRequest = await request.json();

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
        console.error(
          `Failed to copy companion file ${file.sourceBlobPath}:`,
          err
        );
      }
    }

    return NextResponse.json({ success: true, copied: results.length });
  } catch (error) {
    console.error("Copy companion files error:", error);
    return NextResponse.json(
      { error: "Failed to copy companion files" },
      { status: 500 }
    );
  }
}
