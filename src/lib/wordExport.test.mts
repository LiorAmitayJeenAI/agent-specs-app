import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

const originalFetch = global.fetch;
const originalImage = global.Image;
const originalAtob = global.atob;

afterEach(() => {
  global.fetch = originalFetch;
  global.Image = originalImage;
  global.atob = originalAtob;
});

test("formatDocumentValue joins non-empty arrays", () => {
  const result = formatDocumentValue(["CRM", "Billing", "Support"]);

  assert.equal(result, "CRM, Billing, Support");
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

test("formatDocumentValue trims text values", () => {
  const result = formatDocumentValue("  מסמך אפיון  ");

  assert.equal(result, "מסמך אפיון");
});

test("formatDocumentValue returns dash for empty or undefined values", () => {
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock prefers preview images over remote urls", async () => {
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
    naturalWidth = 200;
    naturalHeight = 100;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  } as typeof Image;

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,YWJj",
    url: "https://example.com/image.png",
  });

  assert.equal(fetchCalls, 0);

  assert.deepEqual(result, {
    kind: "image",
    imageData: new Uint8Array([97, 98, 99]),
    width: 200,
    height: 100,
  });
});

test("resolveImageBlock scales oversized images to maximum width", async () => {
  global.fetch = async () => {
    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array([10, 20]).buffer,
    } as Response;
  };

  global.Image = class MockImage {
    naturalWidth = 1000;
    naturalHeight = 500;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  } as typeof Image;

  const result = await resolveImageBlock({
    url: "https://example.com/large.png",
  });

  assert.deepEqual(result, {
    kind: "image",
    imageData: new Uint8Array([10, 20]),
    width: 550,
    height: 275,
  });
});

test("resolveImageBlock scales oversized images to maximum height", async () => {
  global.fetch = async () => {
    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array([5, 6]).buffer,
    } as Response;
  };

  global.Image = class MockImage {
    naturalWidth = 600;
    naturalHeight = 1200;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  } as typeof Image;

  const result = await resolveImageBlock({
    url: "https://example.com/tall.png",
  });

  assert.deepEqual(result, {
    kind: "image",
    imageData: new Uint8Array([5, 6]),
    width: 200,
    height: 400,
  });
});

test("resolveImageBlock returns null when fetch fails", async () => {
  global.fetch = async () => {
    return {
      ok: false,
    } as Response;
  };

  const result = await resolveImageBlock({
    url: "https://example.com/missing.png",
  });

  assert.equal(result, null);
});

test("resolveImageBlock returns null for invalid preview payloads", async () => {
  global.atob = () => {
    throw new Error("invalid base64");
  };

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,%%%invalid%%%",
  });

  assert.equal(result, null);
});