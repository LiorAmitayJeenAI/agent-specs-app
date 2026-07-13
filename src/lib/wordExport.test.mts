import assert from "node:assert/strict";
import { test, mock } from "node:test";
import JSZip from "jszip";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

test("formatDocumentValue formats arrays, booleans, numbers, and trimmed strings", () => {
  assert.equal(formatDocumentValue(["CRM", "Billing"]), "CRM, Billing");
  assert.equal(formatDocumentValue([]), "-");

  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");

  assert.equal(formatDocumentValue(42), "42");

  assert.equal(formatDocumentValue("  hello world  "), "hello world");

  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock returns image block from base64 preview", async () => {
  const originalAtob = globalThis.atob;
  const originalImage = globalThis.Image;

  globalThis.atob = () => "fake-binary";

  class MockImage {
    naturalWidth = 1000;
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

  try {
    const block = await resolveImageBlock({
      preview: "data:image/png;base64,ZmFrZQ==",
    });

    assert.ok(block);
    assert.equal(block.kind, "image");
    assert.equal(block.width, 550);
    assert.equal(block.height, 440);
  } finally {
    globalThis.atob = originalAtob;
    globalThis.Image = originalImage;
  }
});

test("resolveImageBlock falls back to url when preview decoding fails", async () => {
  const originalAtob = globalThis.atob;
  const originalFetch = globalThis.fetch;
  const originalImage = globalThis.Image;

  globalThis.atob = () => {
    throw new Error("invalid base64");
  };

  globalThis.fetch = mock.fn(async () => {
    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
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

  globalThis.Image = MockImage;

  try {
    const block = await resolveImageBlock({
      preview: "bad-preview",
      url: "https://example.com/image.png",
    });

    assert.ok(block);
    assert.equal(block.kind, "image");

    assert.equal(block.width, 400);
    assert.equal(block.height, 300);
  } finally {
    globalThis.atob = originalAtob;
    globalThis.fetch = originalFetch;
    globalThis.Image = originalImage;
  }
});

test("resolveImageBlock returns null when all image loading methods fail", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock.fn(async () => {
    return {
      ok: false,
    };
  });

  try {
    const block = await resolveImageBlock({
      url: "https://example.com/missing.png",
    });

    assert.equal(block, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createHebrewWordBlob generates rtl-enabled docx xml", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock.fn(async () => {
    return {
      ok: false,
    };
  });

  try {
    const blob = await createHebrewWordBlob([
      { kind: "title", text: "מסמך בדיקה" },
      { kind: "heading", text: "כותרת" },
      { kind: "paragraph", text: "פסקה בעברית" },
      { kind: "editableBoolean", value: true },
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
    assert.match(documentXml, /w:lang w:val="he-IL"/);

    assert.match(stylesXml, /<w:rtl w:val="1"\/>/);

    assert.match(settingsXml, /<w:bidi w:val="1"\/>/);
    assert.match(settingsXml, /compatibilityMode/);
    assert.match(settingsXml, /he-IL/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("createHebrewWordBlob creates settings.xml when missing", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = mock.fn(async () => {
    return {
      ok: false,
    };
  });

  try {
    const blob = await createHebrewWordBlob([
      { kind: "paragraph", text: "בדיקת הגדרות" },
    ]);

    const zip = await JSZip.loadAsync(await blob.arrayBuffer());

    const settingsXml = await zip.file("word/settings.xml")?.async("string");

    assert.ok(settingsXml);
    assert.match(settingsXml, /<w:settings/);
    assert.match(settingsXml, /<w:bidi w:val="1"\/>/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});