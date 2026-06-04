const A4_PORTRAIT = { width: 595, height: 842 };
const A4_LANDSCAPE = { width: 842, height: 595 };

interface BuildJpegPdfParams {
  jpegBytes: Uint8Array;
  imageWidth: number;
  imageHeight: number;
}

function asciiBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function xrefOffset(offset: number): string {
  return offset.toString().padStart(10, "0");
}

export function buildJpegPdf({
  jpegBytes,
  imageWidth,
  imageHeight,
}: BuildJpegPdfParams): Uint8Array {
  if (jpegBytes.length === 0 || imageWidth <= 0 || imageHeight <= 0) {
    throw new Error("Invalid PDF image");
  }

  const page =
    imageWidth >= imageHeight
      ? A4_LANDSCAPE
      : A4_PORTRAIT;
  const margin = 36;
  const maxWidth = page.width - margin * 2;
  const maxHeight = page.height - margin * 2;
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
  const drawWidth = Math.round(imageWidth * scale * 100) / 100;
  const drawHeight = Math.round(imageHeight * scale * 100) / 100;
  const drawX = Math.round(((page.width - drawWidth) / 2) * 100) / 100;
  const drawY = Math.round(((page.height - drawHeight) / 2) * 100) / 100;
  const content = `q\n${drawWidth} 0 0 ${drawHeight} ${drawX} ${drawY} cm\n/Im0 Do\nQ\n`;

  const objectBodies: Array<string | Uint8Array> = [
    "<< /Type /Catalog /Pages 2 0 R >>\n",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\n`,
    concatBytes([
      asciiBytes(
        `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
      ),
      jpegBytes,
      asciiBytes("\nendstream\n"),
    ]),
    `<< /Length ${asciiBytes(content).length} >>\nstream\n${content}endstream\n`,
  ];

  const parts: Uint8Array[] = [asciiBytes("%PDF-1.4\n%\xff\xff\xff\xff\n")];
  const offsets = [0];

  objectBodies.forEach((body, index) => {
    offsets.push(parts.reduce((sum, part) => sum + part.length, 0));
    parts.push(asciiBytes(`${index + 1} 0 obj\n`));
    parts.push(typeof body === "string" ? asciiBytes(body) : body);
    parts.push(asciiBytes("endobj\n"));
  });

  const xrefStart = parts.reduce((sum, part) => sum + part.length, 0);
  const xrefEntries = offsets
    .map((offset, index) =>
      index === 0 ? "0000000000 65535 f \n" : `${xrefOffset(offset)} 00000 n \n`
    )
    .join("");

  parts.push(
    asciiBytes(
      `xref\n0 ${offsets.length}\n${xrefEntries}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
    )
  );

  return concatBytes(parts);
}
