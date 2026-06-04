import assert from "node:assert/strict";
import { test } from "node:test";

import {
  normalizeDrawioStyleForPdfExport,
  prepareDrawioXmlForImageExport,
  prepareDrawioXmlForPdfExport,
} from "./exportPdfXml.ts";

test("normalizes HTML Hebrew labels for stable PDF export", () => {
  assert.equal(
    normalizeDrawioStyleForPdfExport("rounded=0;whiteSpace=wrap;html=1;align=center;"),
    "rounded=0;whiteSpace=wrap;html=0;align=center;direction=rtl;"
  );
});

test("moves parent container labels to the top for PDF export", () => {
  const xml = `<mxfile><diagram><mxGraphModel><root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="container" value="סוכן AI" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry width="360" height="260" as="geometry"/></mxCell>
    <mxCell id="child" value="מענה" style="rounded=0;whiteSpace=wrap;html=1;" vertex="1" parent="container"><mxGeometry x="30" y="50" width="300" height="50" as="geometry"/></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;

  const prepared = prepareDrawioXmlForPdfExport(xml);

  assert.match(prepared, /id="container"[^>]+verticalAlign=top/);
  assert.match(prepared, /id="container"[^>]+spacingTop=8/);
  assert.match(prepared, /id="child"[^>]+html=0/);
});

test("keeps draw.io XML unchanged for image export", () => {
  const xml = `<mxfile><diagram><mxGraphModel><root>
    <mxCell id="0"/>
    <mxCell id="1" parent="0"/>
    <mxCell id="container" value="חקר יישומי AI: סוכן" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry width="360" height="260" as="geometry"/></mxCell>
    <mxCell id="child" value="אורקסטרציה וניהול שיחה" style="rounded=0;whiteSpace=wrap;html=1;align=center;" vertex="1" parent="container"><mxGeometry x="30" y="50" width="300" height="50" as="geometry"/></mxCell>
  </root></mxGraphModel></diagram></mxfile>`;

  assert.equal(prepareDrawioXmlForImageExport(xml), xml);
});
