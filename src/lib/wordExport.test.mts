import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";

import {
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

const originalFetch = global.fetch;
const originalImage = global.Image;
const originalAtob = global.atob;

class MockImage {
  naturalWidth = 0;
  naturalHeight = 0;

  onload = null;
  onerror = null;

  set src(_value) {
    this.naturalWidth = 1200;
    this.naturalHeight = 800;

    queueMicrotask(() => {
      this.onload?.();
    });
  }
}

beforeEach(() => {
  global.atob = (value) =>
    Buffer.from(value, "base64").toString("binary");

  global.Image = MockImage;

  global.fetch = async () =>
    ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    });
});

afterEach(() => {
  global.fetch = originalFetch;
  global.Image = originalImage;
  global.atob = originalAtob;
});

test("formatDocumentValue joins array values with commas", () => {
  const result = formatDocumentValue(["CRM", "Billing"]);

  assert.equal(result, "CRM, Billing");
});

test("formatDocumentValue returns dash for empty arrays", () => {
  const result = formatDocumentValue([]);

  assert.equal(result, "-");
});

test("formatDocumentValue converts booleans to Hebrew labels", () => {
  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");
});

test("formatDocumentValue converts numbers to strings", () => {
  const result = formatDocumentValue(42);

  assert.equal(result, "42");
});

test("formatDocumentValue trims strings and returns dash for empty values", () => {
  assert.equal(formatDocumentValue("  hello  "), "hello");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock prefers preview images over remote urls", async () => {
  let fetchCalled = false;

  global.fetch = async () => {
    fetchCalled = true;

    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer,
    };
  };

  const block = await resolveImageBlock({
    preview: "data:image/png;base64,YWJj",
    url: "https://example.com/image.png",
  });

  assert.ok(block);
  assert.equal(block.kind, "image");

  assert.equal(fetchCalled, false);

  assert.equal(block.width, 550);
  assert.equal(block.height, 367);

  assert.deepEqual(Array.from(block.imageData), [
    97,
    98,
    99,
  ]);
});

test("resolveImageBlock falls back to url loading when preview is unavailable", async () => {
  const block = await resolveImageBlock({
    url: "https://example.com/image.png",
  });

  assert.ok(block);
  assert.equal(block.kind, "image");

  assert.equal(block.width, 550);
  assert.equal(block.height, 367);

  assert.deepEqual(Array.from(block.imageData), [1, 2, 3]);
});

test("resolveImageBlock returns null when no image source can be resolved", async () => {
  global.fetch = async () =>
    ({
      ok: false,
    });

  const block = await resolveImageBlock({
    url: "https://example.com/missing.png",
  });

  assert.equal(block, null);
});
