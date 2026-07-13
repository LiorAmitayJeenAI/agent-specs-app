import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

import { resolveDocumentBlocksForExport } from "./prdDocument.ts";

const originalFetch = global.fetch;
const originalImage = global.Image;
const originalAtob = global.atob;

afterEach(() => {
  global.fetch = originalFetch;
  global.Image = originalImage;
  global.atob = originalAtob;
});

test("formatDocumentValue joins array values with commas", () => {
  assert.equal(
    formatDocumentValue(["CRM", "Billing", "Support"]),
    "CRM, Billing, Support"
  );
});

test("formatDocumentValue returns dash for empty arrays", () => {
  assert.equal(formatDocumentValue([]), "-");
});

test("formatDocumentValue converts booleans to Hebrew labels", () => {
  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");
});

test("formatDocumentValue converts numbers to strings", () => {
  assert.equal(formatDocumentValue(42), "42");
});

test("formatDocumentValue trims whitespace and returns dash for empty values", () => {
  assert.equal(formatDocumentValue("  example value  "), "example value");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock loads preview images before remote urls", async () => {
  let fetchCalled = false;

  global.fetch = async () => {
    fetchCalled = true;

    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(4),
    } as Response;
  };

  global.atob = () => "abcd";

  class MockImage {
    naturalWidth = 1200;
    naturalHeight = 800;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }

  global.Image = MockImage as typeof Image;

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,YWJjZA==",
    url: "https://example.com/image.png",
  });

  assert.ok(result);
  assert.equal(result.kind, "image");
  assert.equal(result.width, 550);
  assert.equal(result.height, 367);
  assert.equal(fetchCalled, false);
});

test("resolveImageBlock falls back to remote url when preview is unavailable", async () => {
  global.atob = () => {
    throw new Error("invalid base64");
  };

  global.fetch = async () =>
    ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }) as Response;

  class MockImage {
    naturalWidth = 400;
    naturalHeight = 300;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }

  global.Image = MockImage as typeof Image;

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,invalid",
    url: "https://example.com/fallback.png",
  });

  assert.ok(result);
  assert.equal(result.kind, "image");
  assert.equal(result.width, 400);
  assert.equal(result.height, 300);
});

test("resolveImageBlock returns null when image loading fails", async () => {
  global.fetch = async () =>
    ({
      ok: false,
    }) as Response;

  const result = await resolveImageBlock({
    url: "https://example.com/missing.png",
  });

  assert.equal(result, null);
});

test("resolveDocumentBlocksForExport preserves non-image blocks and resolves image references", async () => {
  global.atob = () => "abcd";

  global.Image = class {
    naturalWidth = 200;
    naturalHeight = 100;
    onload: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  } as typeof Image;

  const blocks = await resolveDocumentBlocksForExport([
    { kind: "paragraph", text: "Intro section" },
    {
      kind: "imageRef",
      preview: "data:image/png;base64,YWJjZA==",
    },
  ]);

  assert.equal(blocks.length, 2);

  assert.deepEqual(blocks[0], {
    kind: "paragraph",
    text: "Intro section",
  });

  assert.equal(blocks[1]?.kind, "image");
});

test("resolveDocumentBlocksForExport skips image blocks that cannot be resolved", async () => {
  global.fetch = async () =>
    ({
      ok: false,
    }) as Response;

  const blocks = await resolveDocumentBlocksForExport([
    { kind: "paragraph", text: "Before image" },
    {
      kind: "imageRef",
      url: "https://example.com/missing.png",
    },
    { kind: "paragraph", text: "After image" },
  ]);

  assert.deepEqual(blocks, [
    {
      kind: "paragraph",
      text: "Before image",
    },
    {
      kind: "paragraph",
      text: "After image",
    },
  ]);
});
