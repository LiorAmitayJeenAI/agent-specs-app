import assert from "node:assert/strict";
import { test, mock } from "node:test";

import JSZip from "jszip";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

test("formatDocumentValue formats arrays, booleans, numbers and empty values correctly", () => {
  assert.equal(formatDocumentValue(["CRM", "Billing"]), "CRM, Billing");
  assert.equal(formatDocumentValue([]), "-");

  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");

  assert.equal(formatDocumentValue(42), "42");

  assert.equal(formatDocumentValue("  hello world  "), "hello world");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock returns null when preview data is invalid and no URL exists", async () => {
  const result = await resolveImageBlock({
    preview: "not-a-valid-data-url",
  });

  assert.equal(result, null);
});

test("resolveImageBlock prefers preview image data before URL loading", async () => {
  const originalAtob = globalThis.atob;
  const originalImage = globalThis.Image;

  globalThis.atob = () => "abc";

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

  globalThis.Image = MockImage;

  const fetchMock = mock.method(globalThis, "fetch", async () => {
    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
  });

  try {
    const result = await resolveImageBlock({
      preview: "data:image/png;base64,ZmFrZQ==",
      url: "https://example.com/image.png",
    });

    assert.ok(result);
    assert.equal(result.kind, "image");

    assert.deepEqual(Array.from(result.imageData), [97, 98, 99]);

    assert.equal(result.width, 550);
    assert.equal(result.height, 367);

    assert.equal(fetchMock.mock.calls.length, 0);
  } finally {
    fetchMock.mock.restore();

    globalThis.atob = originalAtob;
    globalThis.Image = originalImage;
  }
});

test("createHebrewWordBlob injects RTL Hebrew settings into generated docx xml", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך בדיקה" },
    { kind: "heading", text: "פרטי לקוח" },
    { kind: "paragraph", text: "תוכן בעברית" },
    { kind: "editableBoolean", value: true },
    { kind: "editableList", value: ["CRM", "Billing"] },
  ]);

  assert.ok(blob instanceof Blob);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const documentXml = await zip.file("word/document.xml")?.async("string");
  const stylesXml = await zip.file("word/styles.xml")?.async("string");
  const settingsXml = await zip.file("word/settings.xml")?.async("string");

  assert.ok(documentXml);
  assert.ok(stylesXml);
  assert.ok(settingsXml);

  assert.match(documentXml, /<w:bidi w:val="1"\/>/);
  assert.match(documentXml, /<w:rtl w:val="1"\/>/);
  assert.match(documentXml, /w:val="he-IL"/);

  assert.match(stylesXml, /<w:docDefaults>/);
  assert.match(stylesXml, /<w:rFonts w:ascii="Arial"/);

  assert.match(settingsXml, /<w:themeFontLang/);
  assert.match(settingsXml, /w:bidi="he-IL"/);

  assert.equal(
    blob.type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
});

test("createHebrewWordBlob creates a settings.xml file when missing from the generated archive", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "paragraph", text: "בדיקת RTL" },
  ]);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const settingsFile = zip.file("word/settings.xml");

  assert.ok(settingsFile);

  const settingsXml = await settingsFile?.async("string");

  assert.match(settingsXml, /<w:settings/);
  assert.match(settingsXml, /<w:bidi w:val="1"\/>/);
});