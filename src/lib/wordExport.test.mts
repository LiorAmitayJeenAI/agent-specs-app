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

test("resolveImageBlock prefers preview images and scales oversized dimensions", async () => {
  const originalImage = global.Image;
  const originalAtob = global.atob;

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

  global.Image = MockImage;

  global.atob = ((value) =>
    Buffer.from(value, "base64").toString("binary"));

  try {
    const block = await resolveImageBlock({
      preview: "data:image/png;base64,YWJj",
      url: "https://example.com/fallback.png",
    });

    assert.ok(block);
    assert.equal(block.kind, "image");

    assert.equal(block.width, 550);
    assert.equal(block.height, 367);

    assert.ok(block.imageData instanceof Uint8Array);
    assert.equal(block.imageData.length, 3);
  } finally {
    global.Image = originalImage;
    global.atob = originalAtob;
  }
});

test("resolveImageBlock falls back to URL loading when preview is unavailable", async () => {
  const originalFetch = global.fetch;
  const originalImage = global.Image;

  class MockImage {
    naturalWidth = 300;
    naturalHeight = 200;

    onload = null;
    onerror = null;

    set src(_value) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }

  global.Image = MockImage;

  global.fetch = mock.fn(async () => {
    return new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
    });
  });

  try {
    const block = await resolveImageBlock({
      preview: "invalid-preview",
      url: "https://example.com/test.png",
    });

    assert.ok(block);
    assert.equal(block.kind, "image");

    assert.equal(block.width, 300);
    assert.equal(block.height, 200);
  } finally {
    global.fetch = originalFetch;
    global.Image = originalImage;
  }
});

test("resolveImageBlock returns null when image loading fails", async () => {
  const originalFetch = global.fetch;

  global.fetch = mock.fn(async () => {
    return new Response(null, {
      status: 500,
    });
  });

  try {
    const block = await resolveImageBlock({
      url: "https://example.com/missing.png",
    });

    assert.equal(block, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test("createHebrewWordBlob creates a DOCX blob with RTL settings applied", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך בדיקה" },
    { kind: "paragraph", text: "פסקת תוכן" },
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

  assert.ok(documentXml);
  assert.ok(settingsXml);

  assert.match(documentXml, /<w:bidi w:val="1"\/>/);
  assert.match(documentXml, /<w:rtl w:val="1"\/>/);

  assert.match(settingsXml, /he-IL/);
  assert.match(settingsXml, /compatibilityMode/);
});