import assert from "node:assert/strict";
import { test } from "node:test";

import { buildJpegPdf } from "./exportPdfDocument.ts";

test("builds a PDF document containing a JPEG image", () => {
  const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const pdf = buildJpegPdf({ jpegBytes, imageWidth: 120, imageHeight: 80 });
  const text = new TextDecoder().decode(pdf);

  assert.equal(text.startsWith("%PDF-1.4"), true);
  assert.match(text, /\/Subtype \/Image/);
  assert.match(text, /\/Filter \/DCTDecode/);
  assert.match(text, /\/MediaBox \[0 0 842 595\]/);
  assert.match(text, /%%EOF/);
});
