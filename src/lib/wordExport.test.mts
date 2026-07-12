import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

test("formatDocumentValue formats supported primitive values", () => {
  assert.equal(formatDocumentValue(["CRM", "Billing"]), "CRM, Billing");
  assert.equal(formatDocumentValue([]), "-");
  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");
  assert.equal(formatDocumentValue(42), "42");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue("מסמך אפיון"), "מסמך אפיון");
});

test("resolveImageBlock prefers preview images and scales oversized dimensions", async () => {
  const originalAtob = globalThis.atob;
  const originalImage = globalThis.Image;

  globalThis.atob = () => "abcd";

  class MockImage {
    naturalWidth = 1200;
    naturalHeight = 800;
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;

    set src(_value: string) {
      this.onload?.();
    }
  }

  // @ts-expect-error test mock
  globalThis.Image = MockImage;

  try {
    const block = await resolveImageBlock({
      preview: "data:image/png;base64,YWJjZA==",
      url: "https://example.com/fallback.png",
    });

    assert.deepEqual(block, {
      kind: "image",
      imageData: new Uint8Array([97, 98, 99, 100]),
      width: 550,
      height: 367,
    });
  } finally {
    globalThis.atob = originalAtob;
    globalThis.Image = originalImage;
  }
});

test("resolveImageBlock falls back to url loading when preview parsing fails", async () => {
  const originalFetch = globalThis.fetch;
  const originalImage = globalThis.Image;

  globalThis.fetch = async () =>
    new Response(new Uint8Array([1, 2, 3, 4]), {
      status: 200,
      headers: { "Content-Type": "image/png" },
    });

  class MockImage {
    naturalWidth = 300;
    naturalHeight = 200;
    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;

    set src(_value: string) {
      this.onload?.();
    }
  }

  // @ts-expect-error test mock
  globalThis.Image = MockImage;

  try {
    const block = await resolveImageBlock({
      preview: "invalid-preview",
      url: "https://example.com/diagram.png",
    });

    assert.deepEqual(block, {
      kind: "image",
      imageData: new Uint8Array([1, 2, 3, 4]),
      width: 300,
      height: 200,
    });
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Image = originalImage;
  }
});

test("createHebrewWordBlob returns a docx blob", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך אפיון" },
    { kind: "paragraph", text: "תוכן לדוגמה" },
  ]);

  assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.ok(blob.size > 0);
});