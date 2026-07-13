import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import JSZip from "jszip";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

const originalFetch = global.fetch;
const originalImage = global.Image;
const originalAtob = global.atob;

const pngBytes = new Uint8Array([137, 80, 78, 71]);

class MockImage {
  naturalWidth = 800;
  naturalHeight = 600;

  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

beforeEach(() => {
  global.fetch = async () =>
    ({
      ok: true,
      arrayBuffer: async () => pngBytes.buffer,
    }) as Response;

  global.Image = MockImage as typeof Image;

  global.atob = (value: string) => Buffer.from(value, "base64").toString("binary");
});

afterEach(() => {
  global.fetch = originalFetch;
  global.Image = originalImage;
  global.atob = originalAtob;
});

test("formatDocumentValue formats arrays, booleans, numbers and empty values", () => {
  assert.equal(formatDocumentValue(["CRM", "ERP"]), "CRM, ERP");
  assert.equal(formatDocumentValue([]), "-");

  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");

  assert.equal(formatDocumentValue(42), "42");

  assert.equal(formatDocumentValue("  hello  "), "hello");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock prefers preview images over URL images", async () => {
  const block = await resolveImageBlock({
    preview: "data:image/png;base64,YWJj",
    url: "/fallback.png",
  });

  assert.ok(block);
  assert.equal(block?.kind, "image");

  assert.deepEqual(Array.from(block!.imageData), [97, 98, 99]);

  assert.equal(block?.width, 533);
  assert.equal(block?.height, 400);
});

test("resolveImageBlock loads image data from URL when preview is missing", async () => {
  const block = await resolveImageBlock({
    url: "/diagram.png",
  });

  assert.ok(block);
  assert.equal(block?.kind, "image");

  assert.deepEqual(Array.from(block!.imageData), Array.from(pngBytes));

  assert.equal(block?.width, 533);
  assert.equal(block?.height, 400);
});

test("resolveImageBlock returns null when fetch fails", async () => {
  global.fetch = async () =>
    ({
      ok: false,
    }) as Response;

  const block = await resolveImageBlock({
    url: "/missing.png",
  });

  assert.equal(block, null);
});

test("resolveImageBlock returns null for invalid base64 preview content", async () => {
  global.atob = () => {
    throw new Error("invalid base64");
  };

  const block = await resolveImageBlock({
    preview: "data:image/png;base64,%%%invalid%%%",
  });

  assert.equal(block, null);
});

test("createHebrewWordBlob generates a DOCX blob with RTL document settings", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך בדיקה" },
    { kind: "heading", text: "כותרת" },
    { kind: "paragraph", text: "פסקה בעברית" },
  ]);

  assert.ok(blob instanceof Blob);
  assert.equal(
    blob.type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  const zip = await JSZip.loadAsync(blob);

  const documentXml = await zip.file("word/document.xml")?.async("string");
  const settingsXml = await zip.file("word/settings.xml")?.async("string");

  assert.ok(documentXml);
  assert.ok(settingsXml);

  assert.match(documentXml!, /<w:bidi w:val="1"\/>/);
  assert.match(documentXml!, /<w:rtl w:val="1"\/>/);

  assert.match(settingsXml!, /<w:bidi w:val="1"\/>/);
  assert.match(settingsXml!, /he-IL/);
});

test("createHebrewWordBlob includes generated settings.xml when missing", async () => {
  const blob = await createHebrewWordBlob([{ kind: "paragraph", text: "בדיקה" }]);

  const zip = await JSZip.loadAsync(blob);

  const settingsXml = await zip.file("word/settings.xml")?.async("string");

  assert.ok(settingsXml);
  assert.match(settingsXml!, /<w:settings/);
});

test("createHebrewWordBlob supports image blocks in exported documents", async () => {
  const blob = await createHebrewWordBlob([
    {
      kind: "image",
      imageData: pngBytes,
      width: 320,
      height: 180,
    },
  ]);

  const zip = await JSZip.loadAsync(blob);

  const documentXml = await zip.file("word/document.xml")?.async("string");

  assert.ok(documentXml);
  assert.match(documentXml!, /graphic/i);
});