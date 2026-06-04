import sax from "sax";

const FENCE_START = /^```(?:xml|drawio)?\s*\n?/i;
const FENCE_END = /\n?```\s*$/;

export function stripMarkdownFences(raw: string): string {
  let text = raw.trim();
  if (FENCE_START.test(text)) {
    text = text.replace(FENCE_START, "");
  }
  if (FENCE_END.test(text)) {
    text = text.replace(FENCE_END, "");
  }
  return text.trim();
}

function assertWellFormedXml(xml: string) {
  const xmlParser = sax.parser(true);
  let parseError: Error | null = null;

  xmlParser.onerror = (error) => {
    parseError = error;
    xmlParser.resume();
  };

  try {
    xmlParser.write(xml).close();
  } catch (error) {
    parseError = error instanceof Error ? error : new Error(String(error));
  }

  if (parseError) {
    throw new Error(`Invalid draw.io XML: ${parseError.message}`);
  }
}

function assertNoRawLessThanInAttributeValues(xml: string) {
  let inTag = false;
  let quote: '"' | "'" | null = null;

  for (let index = 0; index < xml.length; index += 1) {
    const char = xml[index];

    if (quote) {
      if (char === quote) {
        quote = null;
      } else if (char === "<") {
        throw new Error("Invalid draw.io XML: unescaped < inside an attribute value");
      }
      continue;
    }

    if (inTag) {
      if (char === '"' || char === "'") {
        quote = char;
      } else if (char === ">") {
        inTag = false;
      }
      continue;
    }

    if (char === "<") {
      inTag = true;
    }
  }
}

export function validateDrawioXml(raw: string): string {
  const xml = stripMarkdownFences(raw);
  if (!xml.includes("<mxGraphModel")) {
    throw new Error("Missing mxGraphModel");
  }
  if (!/<mxCell\b/.test(xml)) {
    throw new Error("Missing mxCell elements");
  }

  const normalizedXml = xml.includes("<mxfile")
    ? xml
    : `<mxfile host="app.diagrams.net"><diagram name="diagram" id="diagram-1">${xml}</diagram></mxfile>`;

  assertNoRawLessThanInAttributeValues(normalizedXml);
  assertWellFormedXml(normalizedXml);

  return normalizedXml;
}
