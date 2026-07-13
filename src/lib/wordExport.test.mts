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

test("formatDocumentValue joins array values with commas", () => {
  const result = formatDocumentValue(["CRM", "Billing", "Analytics"]);

  assert.equal(result, "CRM, Billing, Analytics");
});

test("formatDocumentValue returns dash for empty arrays", () => {
  const result = formatDocumentValue([]);

  assert.equal(result, "-");
});

test("formatDocumentValue converts booleans to Hebrew values", () => {
  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");
});

test("formatDocumentValue converts numbers to strings", () => {
  const result = formatDocumentValue(42);

  assert.equal(result, "42");
});

test("formatDocumentValue trims text values", () => {
  const result = formatDocumentValue("   מערכת CRM   ");

  assert.equal(result, "מערכת CRM");
});

test("formatDocumentValue returns dash for empty strings and undefined", () => {
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("resolveImageBlock prefers preview images over remote URLs", async () => {
  let fetchCalls = 0;

  global.fetch = async () => {
    fetchCalls += 1;

    return {
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    } as Response;
  };

  global.atob = () => "\x01\x02\x03";

  global.Image = class MockImage {
    naturalWidth = 200;
    naturalHeight = 100;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.(new Event("load"));
      });
    }

    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event | string) => void) | null = null;
  } as typeof Image;

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,AQID",
    url: "https://example.com/image.png",
  });

  assert.ok(result);
  assert.equal(result.kind, "image");
  assert.equal(result.width, 200);
  assert.equal(result.height, 100);

  assert.equal(fetchCalls, 0);
});

test("resolveImageBlock loads remote images when preview is unavailable", async () => {
  global.fetch = async () =>
    ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([10, 20, 30]).buffer,
    }) as Response;

  global.Image = class MockImage {
    naturalWidth = 1200;
    naturalHeight = 800;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.(new Event("load"));
      });
    }

    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event | string) => void) | null = null;
  } as typeof Image;

  const result = await resolveImageBlock({
    url: "https://example.com/diagram.png",
  });

  assert.ok(result);
  assert.equal(result.kind, "image");

  assert.equal(result.width, 550);
  assert.equal(result.height, 367);
});

test("resolveImageBlock returns null when fetch response is not ok", async () => {
  global.fetch = async () =>
    ({
      ok: false,
    }) as Response;

  const result = await resolveImageBlock({
    url: "https://example.com/missing.png",
  });

  assert.equal(result, null);
});

test("resolveImageBlock returns null when preview base64 is invalid", async () => {
  global.atob = () => {
    throw new Error("invalid base64");
  };

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,%%%INVALID%%%",
  });

  assert.equal(result, null);
});

test("resolveImageBlock falls back to default dimensions when image loading fails", async () => {
  global.fetch = async () =>
    ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    }) as Response;

  global.Image = class MockImage {
    naturalWidth = 0;
    naturalHeight = 0;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onerror?.(new Event("error"));
      });
    }

    onload: ((event: Event) => void) | null = null;
    onerror: ((event: Event | string) => void) | null = null;
  } as typeof Image;

  const result = await resolveImageBlock({
    url: "https://example.com/broken.png",
  });

  assert.ok(result);
  assert.equal(result.width, 400);
  assert.equal(result.height, 300);
});