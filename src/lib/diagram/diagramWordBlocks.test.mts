import assert from "node:assert/strict";
import { test } from "node:test";

import { buildDiagramWordBlocks } from "./diagramWordBlocks.ts";

const imageData = new Uint8Array([1, 2, 3]);

test("does not add a diagrams section when no diagram images exist", () => {
  assert.deepEqual(buildDiagramWordBlocks([]), []);
});

test("adds one titled diagram image to the end of the Word blocks", () => {
  const blocks = buildDiagramWordBlocks([
    {
      title: "תרשים תהליך",
      imageData,
      width: 500,
      height: 280,
    },
  ]);

  assert.equal(blocks.length, 4);
  assert.deepEqual(blocks[0], { kind: "space" });
  assert.deepEqual(blocks[1], { kind: "heading", text: "תרשימים" });
  assert.deepEqual(blocks[2], { kind: "subheading", text: "תרשים תהליך" });
  assert.deepEqual(blocks[3], {
    kind: "image",
    imageData,
    width: 500,
    height: 280,
  });
});

test("adds flow and architecture diagrams in order when both exist", () => {
  const blocks = buildDiagramWordBlocks([
    {
      title: "תרשים תהליך",
      imageData: new Uint8Array([1]),
      width: 500,
      height: 280,
    },
    {
      title: "תרשים ארכיטקטורה",
      imageData: new Uint8Array([2]),
      width: 500,
      height: 300,
    },
  ]);

  assert.equal(blocks.length, 6);
  assert.deepEqual(blocks[1], { kind: "heading", text: "תרשימים" });
  assert.deepEqual(blocks[2], { kind: "subheading", text: "תרשים תהליך" });
  assert.deepEqual(blocks[4], { kind: "subheading", text: "תרשים ארכיטקטורה" });
});

test("includes only selected diagram types when an inclusion filter is provided", () => {
  const blocks = buildDiagramWordBlocks(
    [
      {
        type: "flow",
        title: "תרשים תהליך",
        imageData: new Uint8Array([1]),
        width: 500,
        height: 280,
      },
      {
        type: "architecture",
        title: "תרשים ארכיטקטורה",
        imageData: new Uint8Array([2]),
        width: 500,
        height: 300,
      },
    ],
    { includedTypes: ["architecture"] }
  );

  assert.equal(blocks.length, 4);
  assert.deepEqual(blocks[1], { kind: "heading", text: "תרשימים" });
  assert.deepEqual(blocks[2], { kind: "subheading", text: "תרשים ארכיטקטורה" });
  assert.deepEqual(blocks[3], {
    kind: "image",
    imageData: new Uint8Array([2]),
    width: 500,
    height: 300,
  });
});

test("scales oversized diagram images to fit the Word page", () => {
  const blocks = buildDiagramWordBlocks([
    {
      title: "תרשים תהליך",
      imageData,
      width: 1600,
      height: 900,
    },
  ]);

  assert.deepEqual(blocks[3], {
    kind: "image",
    imageData,
    width: 550,
    height: 309,
  });
});
