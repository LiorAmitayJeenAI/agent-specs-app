import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { formatDocumentValue, resolveImageBlock } from "./wordExport.ts";

const originalFetch = global.fetch;
const originalImage = global.Image;
const originalAtob = global.atob;

afterEach(() => {
  global.fetch = originalFetch;
  global.Image = originalImage;
  global.atob = originalAtob;
});

test("formatDocumentValue formats arrays, booleans, numbers and empty values", () => {
  assert.equal(formatDocumentValue(["CRM", "ERP"]), "CRM, ERP");
  assert.equal(formatDocumentValue([]), "-");

  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");

  assert.equal(formatDocumentValue(42), "42");

  assert.equal(formatDocumentValue("  hello  "), "hello");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock loads image from preview before url", async () => {
  let fetchCalls = 0;

  global.fetch = async () => {
    fetchCalls += 1;

    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as Response;
  };

  global.atob = () => "abc";

  global.Image = class MockImage {
    naturalWidth = 300;
    naturalHeight = 200;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.(new Event("load"));
      });
    }

    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event | string) => void) | null = null;
  } as typeof Image;

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,YWJj",
    url: "https://example.com/image.png",
  });

  assert.ok(result);
  assert.equal(result.kind, "image");

  assert.equal(result.width, 300);
  assert.equal(result.height, 200);

  assert.equal(fetchCalls, 0);
});

test("resolveImageBlock falls back to url when preview cannot be decoded", async () => {
  global.atob = () => {
    throw new Error("invalid base64");
  };

  global.fetch = async () =>
    ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    }) as Response;

  global.Image = class MockImage {
    naturalWidth = 800;
    naturalHeight = 600;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.(new Event("load"));
      });
    }

    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event | string) => void) | null = null;
  } as typeof Image;

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,broken",
    url: "https://example.com/fallback.png",
  });

  assert.ok(result);
  assert.equal(result.kind, "image");

  assert.equal(result.width, 550);
  assert.equal(result.height, 413);
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

test("resolveImageBlock limits image height to maximum allowed size", async () => {
  global.fetch = async () =>
    ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer,
    }) as Response;

  global.Image = class MockImage {
    naturalWidth = 600;
    naturalHeight = 1200;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.(new Event("load"));
      });
    }

    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event | string) => void) | null = null;
  } as typeof Image;

  const result = await resolveImageBlock({
    url: "https://example.com/tall-image.png",
  });

  assert.ok(result);

  assert.equal(result.height, 400);
  assert.equal(result.width, 200);
});