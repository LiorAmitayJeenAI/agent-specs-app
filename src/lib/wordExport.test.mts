import assert from "node:assert/strict";
import { test, mock } from "node:test";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

test("formatDocumentValue formats arrays, booleans, numbers and trimmed strings", () => {
  assert.equal(formatDocumentValue(["CRM", "Billing"]), "CRM, Billing");
  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");
  assert.equal(formatDocumentValue(42), "42");
  assert.equal(formatDocumentValue("  hello world  "), "hello world");
});

test("formatDocumentValue returns fallback marker for empty values", () => {
  assert.equal(formatDocumentValue([]), "-");
  assert.equal(formatDocumentValue(""), "-");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock creates an image block from preview base64 data", async () => {
  const originalAtob = globalThis.atob;
  const originalImage = globalThis.Image;

  globalThis.atob = () => "abcd";

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

  try {
    const result = await resolveImageBlock({
      preview: "data:image/png;base64,AAAA",
    });

    assert.ok(result);
    assert.equal(result.kind, "image");

    assert.ok(result.imageData instanceof Uint8Array);
    assert.equal(result.imageData.length, 4);

    assert.equal(result.width, 550);
    assert.equal(result.height, 367);
  } finally {
    globalThis.atob = originalAtob;
    globalThis.Image = originalImage;
  }
});

test("resolveImageBlock falls back to url loading when preview cannot be resolved", async () => {
  const originalFetch = globalThis.fetch;
  const originalImage = globalThis.Image;
  const originalAtob = globalThis.atob;

  globalThis.atob = () => {
    throw new Error("invalid base64");
  };

  const fetchMock = mock.fn(async () => {
    return {
      ok: true,
      async arrayBuffer() {
        return new Uint8Array([1, 2, 3, 4]).buffer;
      },
    };
  });

  globalThis.fetch = fetchMock;

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
    const result = await resolveImageBlock({
      preview: "data:image/png;base64,broken",
      url: "/images/example.png",
    });

    assert.ok(result);
    assert.equal(result.kind, "image");
    assert.equal(result.width, 400);
    assert.equal(result.height, 300);

    assert.equal(fetchMock.mock.callCount(), 1);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.Image = originalImage;
    globalThis.atob = originalAtob;
  }
});

test("resolveImageBlock returns null when both preview and url loading fail", async () => {
  const originalFetch = globalThis.fetch;
  const originalAtob = globalThis.atob;

  globalThis.atob = () => {
    throw new Error("decode failure");
  };

  const fetchMock = mock.fn(async () => {
    return {
      ok: false,
    };
  });

  globalThis.fetch = fetchMock;

  try {
    const result = await resolveImageBlock({
      preview: "data:image/png;base64,broken",
      url: "/missing.png",
    });

    assert.equal(result, null);
    assert.equal(fetchMock.mock.callCount(), 1);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.atob = originalAtob;
  }
});

test("createHebrewWordBlob generates a DOCX blob", async () => {
  const originalFetch = globalThis.fetch;

  const fetchMock = mock.fn(async () => {
    return {
      ok: false,
    };
  });

  globalThis.fetch = fetchMock;

  try {
    const blob = await createHebrewWordBlob([
      { kind: "title", text: "מסמך בדיקה" },
      { kind: "heading", text: "פרק ראשון" },
      { kind: "paragraph", text: "תוכן הבדיקה" },
      { kind: "editableBoolean", value: true },
    ]);

    assert.ok(blob instanceof Blob);
    assert.equal(
      blob.type,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );

    assert.ok(blob.size > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});