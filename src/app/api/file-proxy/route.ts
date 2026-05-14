import { NextRequest, NextResponse } from "next/server";
import { getBlobStream } from "@/lib/azure-storage";

export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "חסר פרמטר path" }, { status: 400 });
  }

  if (path.includes("..") || path.startsWith("/")) {
    return NextResponse.json({ error: "נתיב לא חוקי" }, { status: 400 });
  }

  try {
    const blobData = await getBlobStream(path);

    if (!blobData || !blobData.stream) {
      return NextResponse.json({ error: "הקובץ לא נמצא" }, { status: 404 });
    }

    const chunks: Uint8Array[] = [];
    const reader = blobData.stream as unknown as AsyncIterable<Uint8Array>;
    for await (const chunk of reader) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": blobData.contentType,
        "Content-Length": String(body.length),
        "Content-Disposition": `inline; filename="${blobData.fileName}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("File proxy error:", error);
    return NextResponse.json(
      { error: "אירעה שגיאה בטעינת הקובץ" },
      { status: 500 }
    );
  }
}
