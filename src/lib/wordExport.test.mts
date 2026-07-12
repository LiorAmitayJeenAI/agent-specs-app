import assert from "node:assert/strict";
import { test, mock } from "node:test";
import JSZip from "jszip";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

test("formatDocumentValue formats arrays, booleans, numbers, and empty values correctly", () => {
  assert.equal(formatDocumentValue(["CRM", "Billing"]), "CRM, Billing");
  assert.equal(formatDocumentValue([]), "-");

  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");

  assert.equal(formatDocumentValue(42), "42");

  assert.equal(formatDocumentValue("  hello  "), "hello");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock returns image block from base64 preview", async () => {
  const originalImage = global.Image;

  class MockImage {
    naturalWidth = 1200;
    naturalHeight = 800;

    onload = null;
    onerror = null;

    set src(_value) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }

  // @ts-expect-error test mock
  global.Image = MockImage;

  const base64Payload = Buffer.from("fake-image").toString("base64");

  const block = await resolveImageBlock({
    preview: `data:image/png;base64,${base64Payload}`,
  });

  global.Image = originalImage;

  assert.ok(block);
  assert.equal(block?.kind, "image");
  assert.equal(block?.width, 550);
  assert.equal(block?.height, 367);
  assert.ok(block?.imageData instanceof Uint8Array);
});

test("resolveImageBlock falls back to url when preview cannot be decoded", async () => {
  const originalFetch = global.fetch;
  const originalImage = global.Image;

  global.fetch = mock.fn(async () => {
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
    });
  });

  class MockImage {
    naturalWidth = 400;
    naturalHeight = 300;

    onload = null;
    onerror = null;

    set src(_value) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }

  // @ts-expect-error test mock
  global.Image = MockImage;

  const block = await resolveImageBlock({
    preview: "data:image/png;base64,",
    url: "https://example.com/test.png",
  });

  global.fetch = originalFetch;
  global.Image = originalImage;

  assert.ok(block);
  assert.equal(block?.kind, "image");
  assert.equal(block?.width, 400);
  assert.equal(block?.height, 300);
});

test("resolveImageBlock returns null when all image loading methods fail", async () => {
  const originalFetch = global.fetch;

  global.fetch = mock.fn(async () => {
    return new Response(null, { status: 500 });
  });

  const block = await resolveImageBlock({
    url: "https://example.com/missing.png",
  });

  global.fetch = originalFetch;

  assert.equal(block, null);
});

test("createHebrewWordBlob generates docx with RTL document settings", async () => {
  const originalFetch = global.fetch;

  global.fetch = mock.fn(async () => {
    return new Response(null, { status: 404 });
  });

  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך בדיקה" },
    { kind: "paragraph", text: "פסקת תוכן" },
    { kind: "editableBoolean", value: true },
  ]);

  global.fetch = originalFetch;

  assert.ok(blob instanceof Blob);

  const zip = await JSZip.loadAsync(blob);

  const documentXml = await zip.file("word/document.xml")?.async("string");
  const settingsXml = await zip.file("word/settings.xml")?.async("string");
  const stylesXml = await zip.file("word/styles.xml")?.async("string");

  assert.ok(documentXml);
  assert.ok(settingsXml);
  assert.ok(stylesXml);

  assert.match(documentXml, /<w:bidi w:val="1"\/>/);
  assert.match(documentXml, /<w:rtl w:val="1"\/>/);

  assert.match(settingsXml, /<w:themeFontLang/);
  assert.match(settingsXml, /w:bidi="he-IL"/);

  assert.match(stylesXml, /Arial/);
  assert.match(stylesXml, /he-IL/);
});

test("createHebrewWordBlob creates numbering and settings documents when needed", async () => {
  const originalFetch = global.fetch;

  global.fetch = mock.fn(async () => {
    return new Response(null, { status: 404 });
  });

  const blob = await createHebrewWordBlob([
    { kind: "heading", text: "כותרת" },
    { kind: "paragraph", text: "תוכן" },
  ]);

  global.fetch = originalFetch;

  const zip = await JSZip.loadAsync(blob);

  const settingsXml = await zip.file("word/settings.xml")?.async("string");

  assert.ok(settingsXml);
  assert.match(settingsXml, /<w:bidi w:val="1"\/>/);
  assert.match(settingsXml, /compatibilityMode/);
});