import assert from "node:assert/strict";
import { test, mock } from "node:test";
import JSZip from "jszip";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

test("formatDocumentValue formats arrays, booleans, numbers and empty values", () => {
  assert.equal(formatDocumentValue(["CRM", "Billing"]), "CRM, Billing");
  assert.equal(formatDocumentValue([]), "-");

  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");

  assert.equal(formatDocumentValue(42), "42");

  assert.equal(formatDocumentValue("  hello world  "), "hello world");
  assert.equal(formatDocumentValue("   "), "-");

  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock prefers preview images over url images", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("fetch should not be called when preview exists");
  });

  const imageMock = mock.method(globalThis, "Image", class {
    naturalWidth = 800;
    naturalHeight = 600;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  } as unknown as typeof Image);

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,QUJD",
    url: "https://example.com/image.png",
  });

  assert.ok(result);
  assert.equal(result.kind, "image");

  assert.equal(result.width, 533);
  assert.equal(result.height, 400);

  assert.deepEqual(Array.from(result.imageData), [65, 66, 67]);

  fetchMock.mock.restore();
  imageMock.mock.restore();
});

test("resolveImageBlock falls back to url loading when preview is invalid", async () => {
  const pngBytes = new Uint8Array([1, 2, 3, 4]);

  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    ok: true,
    arrayBuffer: async () => pngBytes.buffer,
  }) as Response);

  const imageMock = mock.method(globalThis, "Image", class {
    naturalWidth = 1200;
    naturalHeight = 500;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  } as unknown as typeof Image);

  const result = await resolveImageBlock({
    preview: "invalid-base64",
    url: "https://example.com/diagram.png",
  });

  assert.ok(result);
  assert.equal(result.kind, "image");

  assert.equal(result.width, 550);
  assert.equal(result.height, 229);

  assert.deepEqual(Array.from(result.imageData), [1, 2, 3, 4]);

  assert.equal(fetchMock.mock.callCount(), 1);

  fetchMock.mock.restore();
  imageMock.mock.restore();
});

test("resolveImageBlock returns null when all image loading attempts fail", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    ok: false,
  }) as Response);

  const result = await resolveImageBlock({
    url: "https://example.com/missing.png",
  });

  assert.equal(result, null);

  fetchMock.mock.restore();
});

test("createHebrewWordBlob generates a docx blob with RTL settings", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    ok: false,
  }) as Response);

  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך בדיקה" },
    { kind: "paragraph", text: "פסקה בעברית" },
    { kind: "editableBoolean", value: true },
  ]);

  assert.ok(blob instanceof Blob);
  assert.equal(
    blob.type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const documentXml = await zip.file("word/document.xml")?.async("string");
  const settingsXml = await zip.file("word/settings.xml")?.async("string");
  const stylesXml = await zip.file("word/styles.xml")?.async("string");

  assert.ok(documentXml);
  assert.ok(settingsXml);
  assert.ok(stylesXml);

  assert.match(documentXml!, /<w:bidi w:val="1"\/>/);
  assert.match(documentXml!, /<w:rtl w:val="1"\/>/);

  assert.match(settingsXml!, /<w:themeFontLang/);
  assert.match(settingsXml!, /he-IL/);

  assert.match(stylesXml!, /Arial/);

  fetchMock.mock.restore();
});