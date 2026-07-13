import assert from "node:assert/strict";
import { mock, test } from "node:test";
import JSZip from "jszip";

import {
  createHebrewWordBlob,
  formatDocumentValue,
  resolveImageBlock,
} from "./wordExport.ts";

async function extractDocumentXml(blob: Blob) {
  const zip = await JSZip.loadAsync(blob);

  const documentXml = await zip
    .file("word/document.xml")
    ?.async("string");

  assert.ok(documentXml);

  return documentXml;
}

test("formatDocumentValue converts supported values into display strings", () => {
  assert.equal(formatDocumentValue(undefined), "-");
  assert.equal(formatDocumentValue(""), "-");
  assert.equal(formatDocumentValue("   "), "-");

  assert.equal(formatDocumentValue("מערכת CRM"), "מערכת CRM");

  assert.equal(
    formatDocumentValue(["CRM", "Billing"]),
    "CRM, Billing"
  );

  assert.equal(formatDocumentValue([]), "-");

  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");

  assert.equal(formatDocumentValue(123), "123");
});

test("createHebrewWordBlob renders textual blocks into the document xml", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך אפיון" },
    { kind: "heading", text: "סקירה כללית" },
    { kind: "paragraph", text: "תיאור המערכת" },
    { kind: "editableBoolean", value: true },
    { kind: "editableList", value: ["Slack", "Jira"] },
  ]);

  const xml = await extractDocumentXml(blob);

  assert.match(xml, /מסמך אפיון/);
  assert.match(xml, /סקירה כללית/);
  assert.match(xml, /תיאור המערכת/);

  assert.match(xml, />כן</);
  assert.match(xml, /Slack, Jira/);
});

test("createHebrewWordBlob injects RTL paragraph and run configuration", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "paragraph", text: "פסקה בעברית" },
  ]);

  const xml = await extractDocumentXml(blob);

  assert.match(xml, /<w:bidi w:val="1"\/>/);
  assert.match(xml, /<w:rtl w:val="1"\/>/);

  assert.match(
    xml,
    /w:lang w:val="he-IL" w:eastAsia="he-IL" w:bidi="he-IL"/
  );

  assert.match(
    xml,
    /<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"\/>/
  );
});

test("createHebrewWordBlob preserves center alignment for image blocks", async () => {
  const blob = await createHebrewWordBlob([
    {
      kind: "image",
      imageData: Uint8Array.from([1, 2, 3]),
      width: 200,
      height: 100,
    },
  ]);

  const xml = await extractDocumentXml(blob);

  assert.match(xml, /w:jc w:val="center"/);
});

test("createHebrewWordBlob forces start alignment for regular paragraphs", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "paragraph", text: "יישור RTL" },
  ]);

  const xml = await extractDocumentXml(blob);

  assert.match(xml, /w:jc w:val="start"/);
});

test("createHebrewWordBlob generates settings xml with compatibility mode", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "paragraph", text: "בדיקה" },
  ]);

  const zip = await JSZip.loadAsync(blob);

  const settingsXml = await zip
    .file("word/settings.xml")
    ?.async("string");

  assert.ok(settingsXml);

  assert.match(settingsXml, /<w:bidi w:val="1"\/>/);

  assert.match(
    settingsXml,
    /compatibilityMode/
  );

  assert.match(
    settingsXml,
    /themeFontLang w:val="he-IL"/
  );
});

test("resolveImageBlock uses preview image before remote url", async () => {
  const originalAtob = globalThis.atob;
  const originalImage = globalThis.Image;

  globalThis.atob = () => "abc";

  class MockImage {
    naturalWidth = 1200;
    naturalHeight = 800;

    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }

  // @ts-expect-error test mock
  globalThis.Image = MockImage;

  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async () => {
      throw new Error("fetch should not run");
    }
  );

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,YWJj",
    url: "https://example.com/file.png",
  });

  assert.ok(result);

  assert.equal(result.kind, "image");
  assert.equal(result.width, 550);
  assert.equal(result.height, 367);

  assert.equal(fetchMock.mock.callCount(), 0);

  fetchMock.mock.restore();

  globalThis.atob = originalAtob;
  globalThis.Image = originalImage;
});

test("resolveImageBlock falls back to remote url when preview parsing fails", async () => {
  const originalAtob = globalThis.atob;
  const originalImage = globalThis.Image;

  globalThis.atob = () => {
    throw new Error("invalid base64");
  };

  class MockImage {
    naturalWidth = 400;
    naturalHeight = 300;

    onload: null | (() => void) = null;
    onerror: null | (() => void) = null;

    set src(_value: string) {
      queueMicrotask(() => {
        this.onload?.();
      });
    }
  }

  // @ts-expect-error test mock
  globalThis.Image = MockImage;

  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async () =>
      ({
        ok: true,
        arrayBuffer: async () =>
          Uint8Array.from([1, 2, 3]).buffer,
      }) as Response
  );

  const result = await resolveImageBlock({
    preview: "data:image/png;base64,broken",
    url: "https://example.com/fallback.png",
  });

  assert.ok(result);

  assert.equal(result.width, 400);
  assert.equal(result.height, 300);

  assert.deepEqual(
    Array.from(result.imageData),
    [1, 2, 3]
  );

  assert.equal(fetchMock.mock.callCount(), 1);

  fetchMock.mock.restore();

  globalThis.atob = originalAtob;
  globalThis.Image = originalImage;
});

test("resolveImageBlock returns null when image download fails", async () => {
  const fetchMock = mock.method(
    globalThis,
    "fetch",
    async () =>
      ({
        ok: false,
      }) as Response
  );

  const result = await resolveImageBlock({
    url: "https://example.com/missing.png",
  });

  assert.equal(result, null);

  assert.equal(fetchMock.mock.callCount(), 1);

  fetchMock.mock.restore();
});