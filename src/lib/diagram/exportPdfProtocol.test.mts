import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildNextExportAction,
  isTrustedDrawioOrigin,
  summarizeDrawioMessage,
} from "./exportPdfProtocol.ts";

test("loads the diagram before requesting a PDF export", () => {
  const xml = "<mxfile><diagram><mxGraphModel /></diagram></mxfile>";

  assert.deepEqual(buildNextExportAction({ event: "init" }, xml), {
    action: "load",
    xml,
    noExitBtn: 1,
    noSaveBtn: 1,
  });

  assert.deepEqual(buildNextExportAction({ event: "load" }, xml), {
    action: "export",
    border: 20,
    format: "png",
    spinKey: "export",
    xml,
  });
});

test("requests a native transparent PNG for image export", () => {
  const xml = "<mxfile><diagram><mxGraphModel /></diagram></mxfile>";

  assert.deepEqual(buildNextExportAction({ event: "load" }, xml, { intent: "image" }), {
    action: "export",
    border: 0,
    format: "png",
    scale: 1,
    size: "diagram",
    spinKey: "export",
    transparent: true,
    withSvg: true,
  });
});

test("accepts draw.io origins used by embedded editor messages", () => {
  assert.equal(isTrustedDrawioOrigin("https://embed.diagrams.net"), true);
  assert.equal(isTrustedDrawioOrigin("https://app.diagrams.net"), true);
  assert.equal(isTrustedDrawioOrigin("https://viewer.diagrams.net"), true);
  assert.equal(isTrustedDrawioOrigin("https://example.com"), false);
});

test("summarizes draw.io messages for PDF export diagnostics", () => {
  assert.equal(
    summarizeDrawioMessage({ event: "export", format: "png", message: "wrong format" }),
    "event=export format=png message=wrong format"
  );

  assert.equal(summarizeDrawioMessage({ event: "init" }), "event=init");
});
