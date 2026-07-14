import assert from "node:assert/strict";
import { test } from "node:test";

import JSZip from "jszip";

import {
  createHebrewWordBlob,
  formatDocumentValue,
} from "./wordExport.ts";

test("formatDocumentValue formats arrays, booleans, numbers, and empty values correctly", () => {
  assert.equal(formatDocumentValue(["CRM", "Billing"]), "CRM, Billing");

  assert.equal(formatDocumentValue([]), "-");

  assert.equal(formatDocumentValue(true), "כן");
  assert.equal(formatDocumentValue(false), "לא");

  assert.equal(formatDocumentValue(42), "42");

  assert.equal(formatDocumentValue("  hello world  "), "hello world");

  assert.equal(formatDocumentValue(""), "-");
  assert.equal(formatDocumentValue("   "), "-");
  assert.equal(formatDocumentValue(undefined), "-");
});

test("createHebrewWordBlob injects RTL and Hebrew language settings into the generated DOCX", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "title", text: "מסמך אפיון" },
    { kind: "heading", text: "פרטי מערכת" },
    { kind: "paragraph", text: "זהו טקסט בדיקה" },
    { kind: "editableBoolean", value: true },
    { kind: "editableList", value: ["CRM", "Billing"] },
  ]);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const documentXml = await zip.file("word/document.xml")?.async("string");
  const stylesXml = await zip.file("word/styles.xml")?.async("string");
  const settingsXml = await zip.file("word/settings.xml")?.async("string");

  assert.ok(documentXml);
  assert.ok(stylesXml);
  assert.ok(settingsXml);

  assert.match(documentXml!, /<w:bidi w:val="1"\/>/);
  assert.match(documentXml!, /<w:rtl w:val="1"\/>/);

  assert.match(documentXml!, /w:lang[^>]*w:val="he-IL"/);

  assert.match(stylesXml!, /<w:bidi w:val="1"\/>/);
  assert.match(stylesXml!, /<w:rtl w:val="1"\/>/);

  assert.match(settingsXml!, /<w:bidi w:val="1"\/>/);

  assert.match(settingsXml!, /compatibilityMode/);
});

test("createHebrewWordBlob preserves Hebrew content inside the generated DOCX", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "title", text: "כותרת ראשית" },
    { kind: "paragraph", text: "פסקת בדיקה בעברית" },
    { kind: "editableText", value: "תוכן ניתן לעריכה" },
  ]);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const documentXml = await zip.file("word/document.xml")?.async("string");

  assert.ok(documentXml);

  assert.match(documentXml!, /כותרת ראשית/);
  assert.match(documentXml!, /פסקת בדיקה בעברית/);
  assert.match(documentXml!, /תוכן ניתן לעריכה/);
});

test("createHebrewWordBlob renders formatted editable values into the document", async () => {
  const blob = await createHebrewWordBlob([
    { kind: "editableBoolean", value: false },
    { kind: "editableList", value: ["API", "CRM"] },
    { kind: "editableText", value: "  trimmed text  " },
  ]);

  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  const documentXml = await zip.file("word/document.xml")?.async("string");

  assert.ok(documentXml);

  assert.match(documentXml!, />לא</);
  assert.match(documentXml!, />API, CRM</);
  assert.match(documentXml!, />trimmed text</);
});
