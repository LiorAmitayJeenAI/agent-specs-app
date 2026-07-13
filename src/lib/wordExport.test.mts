import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";
import JSZip from "jszip";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_IMAGE = global.Image;
const ORIGINAL_ATOB = global.atob;

const PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXSsAAAAASUVORK5CYII=";

beforeEach(() => {
  global.atob = ((input: string) =>
    Buffer.from(input, "base64").toString("binary")) as typeof atob;
});

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  global.Image = ORIGINAL_IMAGE;
  global.atob = ORIGINAL_ATOB;
});

test("formatDocumentValue formats arrays, booleans, numbers, and empty values", () => {
  assert.equal(formatDocumentValue(["CRM", "Billing"]), "CRM, Billing");
  assert.equal(formatDocumentValue([]), "-");

  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");

  assert.equal(formatDocumentValue(42), "42");

  assert.equal(formatDocumentValue("  hello  "), "hello");
  assert.equal(formatDocumentValue(""), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock creates an image block from base64 preview data", async () => {
  class MockImage {
    naturalWidth = 1200;
    naturalHeight = 800;

    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      this.onload?.();
    }
  }

  global.Image = MockImage as typeof Image;

  const block = await resolveImageBlock({
    preview: `data:image/png;base64,${PNG_BASE64}`,
  });

  assert.ok(block);
  assert.equal(block.kind, "image");

  assert.equal(block.width, 550);
  assert.equal(block.height, 367);

  assert.ok(block.imageData instanceof Uint8Array);
  assert.ok(block.imageData.length > 0);
});

test("resolveImageBlock falls back to url loading when preview decoding fails", async () => {
  class MockImage {
    naturalWidth = 300;
    naturalHeight = 200;

    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      this.onload?.();
    }
  }

  global.Image = MockImage as typeof Image;

  global.fetch = (async () => ({
    ok: true,
    arrayBuffer: async () => Uint8Array.from([1, 2, 3]).buffer,
  })) as typeof fetch;

  const block = await resolveImageBlock({
    preview: "invalid-base64",
    url: "https://example.com/image.png",
  });

  assert.ok(block);
  assert.equal(block.kind, "image");
  assert.equal(block.width, 300);
  assert.equal(block.height, 200);
});

test("resolveImageBlock returns null when image loading fails", async () => {
  global.fetch = (async () => ({
    ok: false,
  })) as typeof fetch;

  const block = await resolveImageBlock({
    url: "https://example.com/missing.png",
  });

  assert.equal(block, null);
});

test("createHebrewWordBlob generates docx with RTL Hebrew document settings", async () => {
  global.fetch = (async () => ({
    ok: false,
  })) as typeof fetch;

  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך בדיקה" },
    { kind: "heading", text: "כותרת" },
    { kind: "paragraph", text: "פסקה בעברית" },
    { kind: "editableBoolean", value: true },
    { kind: "editableList", value: ["א", "ב"] },
  ]);

  assert.ok(blob instanceof Blob);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const documentXml = await zip.file("word/document.xml")?.async("string");
  const settingsXml = await zip.file("word/settings.xml")?.async("string");
  const stylesXml = await zip.file("word/styles.xml")?.async("string");

  assert.ok(documentXml);
  assert.ok(settingsXml);
  assert.ok(stylesXml);

  assert.match(documentXml!, /<w:bidi w:val="1"\/>/);
  assert.match(documentXml!, /<w:rtl w:val="1"\/>/);
  assert.match(documentXml!, /<w:jc w:val="start"\/>/);

  assert.match(settingsXml!, /<w:themeFontLang/);
  assert.match(settingsXml!, /w:bidi="he-IL"/);

  assert.match(stylesXml!, /Arial/);
  assert.match(stylesXml!, /he-IL/);

  assert.match(documentXml!, /מסמך בדיקה/);
  assert.match(documentXml!, /פסקה בעברית/);
});

test("createHebrewWordBlob creates settings.xml when missing from generated package", async () => {
  global.fetch = (async () => ({
    ok: false,
  })) as typeof fetch;

  const blob = await createHebrewWordBlob([
    { kind: "paragraph", text: "בדיקת הגדרות" },
  ]);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const settingsFile = zip.file("word/settings.xml");

  assert.ok(settingsFile);

  const settingsXml = await settingsFile?.async("string");

  assert.match(settingsXml!, /<w:settings/);
  assert.match(settingsXml!, /<w:bidi w:val="1"\/>/);
});