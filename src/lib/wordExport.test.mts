import assert from "node:assert/strict";
import { test } from "node:test";
import JSZip from "jszip";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

const originalFetch = global.fetch;
const originalImage = global.Image;
const originalAtob = global.atob;

function mockImageDimensions(width: number, height: number) {
  class MockImage {
    naturalWidth = width;
    naturalHeight = height;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }

  // @ts-expect-error test mock
  global.Image = MockImage;
}

test("formatDocumentValue formats arrays, booleans, numbers and strings", () => {
  assert.equal(formatDocumentValue(["CRM", "Billing"]), "CRM, Billing");
  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");
  assert.equal(formatDocumentValue(42), "42");
  assert.equal(formatDocumentValue("  מערכת תביעות  "), "מערכת תביעות");
});

test("formatDocumentValue returns fallback dash for empty values", () => {
  assert.equal(formatDocumentValue([]), "-");
  assert.equal(formatDocumentValue(""), "-");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock prefers preview base64 image when available", async () => {
  mockImageDimensions(800, 600);

  global.atob = (value: string) => Buffer.from(value, "base64").toString("binary");

  const block = await resolveImageBlock({
    preview: "data:image/png;base64,YWJj",
    url: "https://example.com/image.png",
  });

  assert.ok(block);
  assert.equal(block?.kind, "image");

  assert.equal(block?.width, 550);
  assert.equal(block?.height, 413);

  assert.ok(block?.imageData instanceof Uint8Array);
});

test("resolveImageBlock falls back to url image loading", async () => {
  mockImageDimensions(400, 300);

  global.fetch = async () =>
    ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }) as Response;

  const block = await resolveImageBlock({
    url: "https://example.com/diagram.png",
  });

  assert.ok(block);
  assert.equal(block?.kind, "image");
  assert.equal(block?.width, 400);
  assert.equal(block?.height, 300);
});

test("resolveImageBlock returns null when image loading fails", async () => {
  global.fetch = async () =>
    ({
      ok: false,
    }) as Response;

  const block = await resolveImageBlock({
    url: "https://example.com/missing.png",
  });

  assert.equal(block, null);
});

test("createHebrewWordBlob generates RTL-enabled DOCX xml", async () => {
  global.fetch = async () =>
    ({
      ok: false,
    }) as Response;

  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך אפיון" },
    { kind: "heading", text: "פרטי מערכת" },
    { kind: "paragraph", text: "זהו טקסט בדיקה" },
    { kind: "editableBoolean", value: true },
  ]);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const documentXml = await zip.file("word/document.xml")?.async("string");
  const stylesXml = await zip.file("word/styles.xml")?.async("string");
  const settingsXml = await zip.file("word/settings.xml")?.async("string");

  assert.ok(documentXml);
  assert.ok(stylesXml);
  assert.ok(settingsXml);

  assert.match(documentXml!, /<w:bidi w:val="1"\/>/);
  assert.match(documentXml!, /<w:rtl w:val="1"\/>/);
  assert.match(documentXml!, /<w:jc w:val="start"\/>/);

  assert.match(stylesXml!, /he-IL/);

  assert.match(settingsXml!, /<w:bidi w:val="1"\/>/);
  assert.match(settingsXml!, /compatibilityMode/);
});

test.after(() => {
  global.fetch = originalFetch;
  global.Image = originalImage;
  global.atob = originalAtob;
});
