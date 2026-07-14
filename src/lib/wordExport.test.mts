import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import JSZip from "jszip";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

const ORIGINAL_FETCH = global.fetch;
const ORIGINAL_IMAGE = global.Image;
const ORIGINAL_ATOB = global.atob;

afterEach(() => {
  global.fetch = ORIGINAL_FETCH;
  global.Image = ORIGINAL_IMAGE;
  global.atob = ORIGINAL_ATOB;
});

test("formatDocumentValue formats arrays, booleans, numbers, and empty values correctly", () => {
  assert.equal(formatDocumentValue(["CRM", "Billing"]), "CRM, Billing");

  assert.equal(formatDocumentValue([]), "-");

  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");

  assert.equal(formatDocumentValue(42), "42");

  assert.equal(formatDocumentValue("  hello world  "), "hello world");

  assert.equal(formatDocumentValue(""), "-");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock prefers preview image data before URL loading", async () => {
  let fetchCalled = false;

  global.fetch = async () => {
    fetchCalled = true;

    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as Response;
  };

  global.atob = (value: string) => {
    assert.equal(value, "QUJD");
    return "ABC";
  };

  class MockImage {
    naturalWidth = 320;
    naturalHeight = 180;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      this.onload?.();
    }
  }

  global.Image = MockImage as typeof Image;

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,QUJD",
    url: "https://example.com/image.png",
  });

  assert.equal(fetchCalled, false);

  assert.deepEqual(result, {
    kind: "image",
    imageData: new Uint8Array([65, 66, 67]),
    width: 320,
    height: 180,
  });
});

test("resolveImageBlock scales oversized images to maximum width", async () => {
  global.fetch = async () =>
    ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    }) as Response;

  class MockImage {
    naturalWidth = 1200;
    naturalHeight = 600;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      this.onload?.();
    }
  }

  global.Image = MockImage as typeof Image;

  const result = await resolveImageBlock({
    url: "https://example.com/diagram.png",
  });

  assert.equal(result?.kind, "image");
  assert.equal(result?.width, 550);
  assert.equal(result?.height, 275);
});

test("resolveImageBlock returns null when fetch response is not ok", async () => {
  global.fetch = async () =>
    ({
      ok: false,
    }) as Response;

  const result = await resolveImageBlock({
    url: "https://example.com/missing-image.png",
  });

  assert.equal(result, null);
});

test("createHebrewWordBlob injects RTL and Hebrew language settings into the generated DOCX", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך אפיון" },
    { kind: "heading", text: "פרטי מערכת" },
    { kind: "paragraph", text: "זהו טקסט בדיקה" },
    { kind: "editableBoolean", value: true },
    { kind: "editableList", value: ["CRM", "Billing"] },
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

  assert.match(documentXml!, /w:lang[^>]*w:val="he-IL"/);

  assert.match(stylesXml!, /<w:bidi w:val="1"\/>/);
  assert.match(stylesXml!, /<w:rtl w:val="1"\/>/);

  assert.match(settingsXml!, /<w:bidi w:val="1"\/>/);

  assert.match(settingsXml!, /compatibilityMode/);
});

test("createHebrewWordBlob preserves Hebrew content inside the generated DOCX", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "title", text: "כותרת ראשית" },
    { kind: "paragraph", text: "פסקת בדיקה בעברית" },
    { kind: "editableText", value: "תוכן ניתן לעריכה" },
  ]);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const documentXml = await zip.file("word/document.xml")?.async("string");

  assert.ok(documentXml);

  assert.match(documentXml!, /כותרת ראשית/);
  assert.match(documentXml!, /פסקת בדיקה בעברית/);
  assert.match(documentXml!, /תוכן ניתן לעריכה/);
});

test("createHebrewWordBlob renders formatted editable values into the document", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "editableBoolean", value: false },
    { kind: "editableList", value: ["API", "CRM"] },
    { kind: "editableText", value: "  trimmed text  " },
  ]);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const documentXml = await zip.file("word/document.xml")?.async("string");

  assert.ok(documentXml);

  assert.match(documentXml!, />לא</);
  assert.match(documentXml!, />API, CRM</);
  assert.match(documentXml!, />trimmed text</);
});