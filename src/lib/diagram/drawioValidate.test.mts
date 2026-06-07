import assert from "node:assert/strict";
import { test } from "node:test";

import { stripMarkdownFences, validateDrawioXml } from "./drawioValidate.ts";

const VALID_GRAPH = `<mxGraphModel><root>
  <mxCell id="0"/>
  <mxCell id="1" parent="0"/>
  <mxCell id="node1" value="ניהול שיחה" vertex="1" parent="1"><mxGeometry x="40" y="40" width="140" height="60" as="geometry"/></mxCell>
</root></mxGraphModel>`;

test("accepts a valid mxfile draw.io document", () => {
  const xml = `<mxfile host="app.diagrams.net"><diagram name="diagram" id="diagram-1">${VALID_GRAPH}</diagram></mxfile>`;

  assert.equal(validateDrawioXml(xml), xml);
});

test("strips optional markdown fences", () => {
  const xml = `<mxfile host="app.diagrams.net"><diagram name="diagram" id="diagram-1">${VALID_GRAPH}</diagram></mxfile>`;

  assert.equal(stripMarkdownFences(`\`\`\`xml\n${xml}\n\`\`\``), xml);
  assert.equal(validateDrawioXml(`\`\`\`drawio\n${xml}\n\`\`\``), xml);
});

test("rejects raw XML tags inside mxCell attribute values", () => {
  const xml = `<mxfile host="app.diagrams.net"><diagram name="diagram" id="diagram-1"><mxGraphModel><root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="node1" value="ניהול שיחה<br/>ותזמור בקשות" vertex="1" parent="1"><mxGeometry x="40" y="40" width="140" height="60" as="geometry"/></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;

  assert.throws(() => validateDrawioXml(xml), /Invalid draw\.io XML/);
});

test("accepts escaped line breaks inside mxCell attribute values", () => {
  const xml = `<mxfile host="app.diagrams.net"><diagram name="diagram" id="diagram-1"><mxGraphModel><root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="node1" value="ניהול שיחה&lt;br/&gt;ותזמור בקשות" vertex="1" parent="1"><mxGeometry x="40" y="40" width="140" height="60" as="geometry"/></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;

  assert.equal(validateDrawioXml(xml), xml);
});

test("wraps a valid bare mxGraphModel in an mxfile shell", () => {
  assert.equal(
    validateDrawioXml(VALID_GRAPH),
    `<mxfile host="app.diagrams.net"><diagram name="diagram" id="diagram-1">${VALID_GRAPH}</diagram></mxfile>`
  );
});
