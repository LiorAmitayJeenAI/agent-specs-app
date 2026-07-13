import assert from "node:assert/strict";
import { test, mock } from "node:test";
import JSZip from "jszip";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

test("formatDocumentValue formats arrays, booleans, numbers, and empty values", () => {
  assert.equal(formatDocumentValue(["CRM", "Billing"]), "CRM, Billing");
  assert.equal(formatDocumentValue([]), "-");

  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");

  assert.equal(formatDocumentValue(42), "42");

  assert.equal(formatDocumentValue("  hello  "), "hello");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock loads image data from preview base64 before URL", async () => {
  const base64 = Buffer.from("fake-image").toString("base64");

  globalThis.Image = class {
    naturalWidth = 800;
    naturalHeight = 600;
    onload = null;
    onerror = null;

    set src(_value) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  };

  const fetchMock = mock.method(globalThis, "fetch", async () => {
    throw new Error("fetch should not be called when preview exists");
  });

  const block = await resolveImageBlock({
    preview: `data:image/png;base64,${base64}`,
    url: "https://example.com/image.png",
  });

  fetchMock.mock.restore();

  assert.ok(block);
  assert.equal(block?.kind, "image");

  assert.equal(block?.width, 550);
  assert.equal(block?.height, 413);

  assert.ok(block?.imageData instanceof Uint8Array);
  assert.equal(block?.imageData.length, "fake-image".length);
});

test("resolveImageBlock returns null when image loading fails", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    ok: false,
  }));

  const block = await resolveImageBlock({
    url: "https://example.com/missing.png",
  });

  fetchMock.mock.restore();

  assert.equal(block, null);
});

test("createHebrewWordBlob generates DOCX with RTL Hebrew configuration", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    ok: false,
  }));

  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך בדיקה" },
    { kind: "heading", text: "פרטי לקוח" },
    { kind: "paragraph", text: "תוכן בעברית" },
    { kind: "editableBoolean", value: true },
  ]);

  fetchMock.mock.restore();

  assert.ok(blob instanceof Blob);
  assert.equal(
    blob.type,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const documentXml = await zip.file("word/document.xml")?.async("string");
  const stylesXml = await zip.file("word/styles.xml")?.async("string");
  const settingsXml = await zip.file("word/settings.xml")?.async("string");

  assert.ok(documentXml);
  assert.ok(stylesXml);
  assert.ok(settingsXml);

  assert.match(documentXml, /<w:bidi w:val="1"\/>/);
  assert.match(documentXml, /<w:rtl w:val="1"\/>/);
  assert.match(documentXml, /<w:lang w:val="he-IL"/);

  assert.match(stylesXml, /<w:docDefaults>/);
  assert.match(stylesXml, /<w:rFonts w:ascii="Arial"/);

  assert.match(settingsXml, /<w:bidi w:val="1"\/>/);
  assert.match(settingsXml, /compatibilityMode/);
  assert.match(settingsXml, /he-IL/);
});

test("createHebrewWordBlob creates settings.xml when missing from generated package", async () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    ok: false,
  }));

  const blob = await createHebrewWordBlob([
    { kind: "paragraph", text: "בדיקת הגדרות" },
  ]);

  fetchMock.mock.restore();

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const settingsXml = await zip.file("word/settings.xml")?.async("string");

  assert.ok(settingsXml);
  assert.match(settingsXml, /<w:settings/);
  assert.match(settingsXml, /<w:bidi w:val="1"\/>/);
});